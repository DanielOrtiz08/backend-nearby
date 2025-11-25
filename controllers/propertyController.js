const pool = require('../config/database');
const path = require('path');
const fs = require('fs');

// Get all properties with filters
exports.getProperties = async (req, res) => {
    try {
        const {
            search,
            min_price,
            max_price,
            property_type,
            bedrooms,
            neighborhood,
            sort_by = 'created_at',
            order = 'DESC',
            limit = 20,
            offset = 0
        } = req.query;

        let query = `
      SELECT p.*, u.full_name as owner_name, u.phone as owner_phone, u.email as owner_email
      FROM properties p
      JOIN users u ON p.owner_id = u.id
      WHERE p.is_available = true
    `;
        const params = [];
        let paramCount = 1;

        // Add filters
        if (search) {
            query += ` AND (p.title ILIKE $${paramCount} OR p.description ILIKE $${paramCount} OR p.address ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        if (min_price) {
            query += ` AND p.price >= $${paramCount}`;
            params.push(min_price);
            paramCount++;
        }

        if (max_price) {
            query += ` AND p.price <= $${paramCount}`;
            params.push(max_price);
            paramCount++;
        }

        if (property_type) {
            query += ` AND p.property_type = $${paramCount}`;
            params.push(property_type);
            paramCount++;
        }

        if (bedrooms) {
            query += ` AND p.bedrooms >= $${paramCount}`;
            params.push(bedrooms);
            paramCount++;
        }

        if (neighborhood) {
            query += ` AND p.neighborhood ILIKE $${paramCount}`;
            params.push(`%${neighborhood}%`);
            paramCount++;
        }

        // Add sorting
        const allowedSortFields = ['created_at', 'price', 'view_count'];
        const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY p.${sortField} ${sortOrder}`;

        // Add pagination
        query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM properties p WHERE p.is_available = true';
        const countParams = params.slice(0, -2); // Remove limit and offset

        if (countParams.length > 0) {
            countQuery = query.split('ORDER BY')[0].replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM');
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            properties: result.rows,
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Get properties error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get single property by ID
exports.getPropertyById = async (req, res) => {
    try {
        const { id } = req.params;

        // Increment view count
        await pool.query(
            'UPDATE properties SET view_count = view_count + 1 WHERE id = $1',
            [id]
        );

        const result = await pool.query(
            `SELECT p.*, u.full_name as owner_name, u.phone as owner_phone, u.email as owner_email
       FROM properties p
       JOIN users u ON p.owner_id = u.id
       WHERE p.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Property not found' });
        }

        res.json({ property: result.rows[0] });
    } catch (error) {
        console.error('Get property error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Create new property (owner only)
exports.createProperty = async (req, res) => {
    try {
        const {
            title,
            description,
            address,
            neighborhood,
            latitude,
            longitude,
            price,
            property_type,
            bedrooms,
            bathrooms,
            area_sqm,
            available_from,
            amenities,
            rules
        } = req.body;

        // Validate required fields
        if (!title || !address || !price || !property_type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Process uploaded images
        const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

        const result = await pool.query(
            `INSERT INTO properties 
       (owner_id, title, description, address, neighborhood, latitude, longitude, 
        price, property_type, bedrooms, bathrooms, area_sqm, available_from, 
        amenities, rules, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
            [
                req.user.id,
                title,
                description,
                address,
                neighborhood,
                latitude,
                longitude,
                price,
                property_type,
                bedrooms,
                bathrooms,
                area_sqm,
                available_from,
                JSON.stringify(amenities || []),
                rules,
                JSON.stringify(images)
            ]
        );

        res.status(201).json({
            message: 'Property created successfully',
            property: result.rows[0]
        });
    } catch (error) {
        console.error('Create property error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Update property (owner only)
exports.updateProperty = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            description,
            address,
            neighborhood,
            price,
            property_type,
            bedrooms,
            bathrooms,
            area_sqm,
            is_available,
            amenities,
            rules
        } = req.body;

        // Verify ownership
        const ownerCheck = await pool.query(
            'SELECT owner_id FROM properties WHERE id = $1',
            [id]
        );

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Property not found' });
        }

        if (ownerCheck.rows[0].owner_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to update this property' });
        }

        const result = await pool.query(
            `UPDATE properties SET
       title = COALESCE($1, title),
       description = COALESCE($2, description),
       address = COALESCE($3, address),
       neighborhood = COALESCE($4, neighborhood),
       price = COALESCE($5, price),
       property_type = COALESCE($6, property_type),
       bedrooms = COALESCE($7, bedrooms),
       bathrooms = COALESCE($8, bathrooms),
       area_sqm = COALESCE($9, area_sqm),
       is_available = COALESCE($10, is_available),
       amenities = COALESCE($11, amenities),
       rules = COALESCE($12, rules),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $13
       RETURNING *`,
            [title, description, address, neighborhood, price, property_type,
                bedrooms, bathrooms, area_sqm, is_available,
                amenities ? JSON.stringify(amenities) : null, rules, id]
        );

        res.json({
            message: 'Property updated successfully',
            property: result.rows[0]
        });
    } catch (error) {
        console.error('Update property error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete property (owner only)
exports.deleteProperty = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify ownership
        const result = await pool.query(
            'SELECT owner_id, images FROM properties WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Property not found' });
        }

        if (result.rows[0].owner_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to delete this property' });
        }

        // Delete associated images
        const images = result.rows[0].images;
        if (images && Array.isArray(images)) {
            images.forEach(imagePath => {
                const fullPath = path.join(__dirname, '..', imagePath);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            });
        }

        // Delete property
        await pool.query('DELETE FROM properties WHERE id = $1', [id]);

        res.json({ message: 'Property deleted successfully' });
    } catch (error) {
        console.error('Delete property error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get properties by owner
exports.getOwnerProperties = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM properties WHERE owner_id = $1 ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json({ properties: result.rows });
    } catch (error) {
        console.error('Get owner properties error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
