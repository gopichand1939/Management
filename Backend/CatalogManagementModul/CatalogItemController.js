const CatalogItemModel = require("./CatalogItemModel");
const CatalogCategoryModel = require("./CatalogCategoryModel");
const pool = require("../Config/Database");
const xlsx = require("xlsx");

// Quotes-aware native CSV parser
function parseCSV(text) {
    let delimiter = ',';
    // Count in the first 10,000 characters of the file
    const sampleText = text.substring(0, 10000);
    const commaCount = (sampleText.match(/,/g) || []).length;
    const semiCount = (sampleText.match(/;/g) || []).length;
    const tabCount = (sampleText.match(/\t/g) || []).length;
    
    if (tabCount > commaCount && tabCount > semiCount) {
        delimiter = '\t';
    } else if (semiCount > commaCount && semiCount > tabCount) {
        delimiter = ';';
    }

    const lines = [];
    let row = [""];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        const next = text[i + 1];

        if (c === '"') {
            if (inQuotes && next === '"') {
                row[row.length - 1] += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (c === delimiter && !inQuotes) {
            row.push("");
        } else if ((c === '\r' || c === '\n') && !inQuotes) {
            if (c === '\r' && next === '\n') {
                i++;
            }
            lines.push(row);
            row = [""];
        } else {
            row[row.length - 1] += c;
        }
    }
    if (row.length > 1 || row[0] !== "") {
        lines.push(row);
    }
    return lines;
}

// Native CSV serializer
function serializeCSV(headers, rows) {
    const headerRow = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",");
    const bodyRows = rows.map(row => 
        headers.map(h => {
            const val = row[h];
            if (val === null || val === undefined) return '""';
            const str = String(val);
            return `"${str.replace(/"/g, '""')}"`;
        }).join(",")
    );
    return [headerRow, ...bodyRows].join("\r\n");
}

// Sequential SKU Core Calculator helper
const computeSequentialSku = async (institutionId, categoryId, itemName) => {
    // 1. Get category code
    let catCode = "GEN";
    if (categoryId) {
        const category = await CatalogCategoryModel.getCategoryById(categoryId, institutionId);
        if (category && category.category_code) {
            catCode = category.category_code.toUpperCase();
        } else if (category && category.category_name) {
            catCode = category.category_name.replace(/\s+/g, "").substring(0, 4).toUpperCase();
        }
    }

    // 2. Get item prefix
    let itemPrefix = "";
    if (itemName) {
        const words = itemName.trim().split(/\s+/);
        if (words.length >= 3) {
            itemPrefix = (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
        } else {
            itemPrefix = itemName.replace(/\s+/g, "").substring(0, 3).toUpperCase();
        }
    }
    if (!itemPrefix) itemPrefix = "ITM";
    if (itemPrefix.length < 3) {
        itemPrefix = (itemPrefix + "XYZ").substring(0, 3);
    }

    // 3. Scan existing SKUs for sequential index
    const prefixPattern = `${catCode}-${itemPrefix}`;
    const existingSkus = await CatalogItemModel.getExistingSkusByPattern(institutionId, prefixPattern);

    let maxNum = 0;
    existingSkus.forEach(sku => {
        const parts = sku.split("-");
        const finalPart = parts[parts.length - 1];
        const num = parseInt(finalPart, 10);
        if (!isNaN(num) && num > maxNum) {
            maxNum = num;
        }
    });

    const nextNum = maxNum + 1;
    const paddedNum = String(nextNum).padStart(3, "0");
    return `${prefixPattern}-${paddedNum}`;
};

const createItem = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;
    const pgAdminId = req.user?.pg_admin_id;
    const createdBy = req.user?.id;

    if (!institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    try {
        const {
            name,
            sku,
            product_code,
        } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Item name is required",
            });
        }

        // Validate SKU duplicate
        if (sku) {
            const existingSku = await CatalogItemModel.findItemBySku(sku, institutionId);
            if (existingSku) {
                return res.status(409).json({
                    success: false,
                    message: `SKU '${sku}' already exists in your inventory`,
                });
            }
        }

        // Validate Product Code duplicate
        if (product_code) {
            const existingProductCode = await CatalogItemModel.findItemByProductCode(product_code, institutionId);
            if (existingProductCode) {
                return res.status(409).json({
                    success: false,
                    message: `Product Code '${product_code}' already exists in your inventory`,
                });
            }
        }

        const item = await CatalogItemModel.createItem(
            institutionId,
            pgAdminId,
            req.body,
            createdBy
        );

        return res.status(201).json({
            success: true,
            message: "Catalog item created successfully",
            data: item,
        });
    } catch (error) {
        console.error("Error creating catalog item:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const getItemList = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;

    if (!institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    try {
        const page = parseInt(req.body.page) || 1;
        const limit = parseInt(req.body.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.body.search || "";
        const categoryId = req.body.category_id ? parseInt(req.body.category_id) : null;
        const status = req.body.status || "";

        const items = await CatalogItemModel.getItemList(
            institutionId,
            limit,
            offset,
            search,
            categoryId,
            status
        );

        const totalCount = await CatalogItemModel.getItemCount(
            institutionId,
            search,
            categoryId,
            status
        );

        return res.status(200).json({
            success: true,
            data: items,
            pagination: {
                total: totalCount,
                page,
                limit,
                pages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching catalog items:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const getItemById = async (req, res) => {
    const isSuperAdmin = req.user?.role === "super_admin";
    const institutionId = req.user?.institution_id || req.body.institution_id;
    const { id } = req.body;

    if (!isSuperAdmin && !institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    if (!id) {
        return res.status(400).json({
            success: false,
            message: "Item ID is required",
        });
    }

    try {
        const item = await CatalogItemModel.getItemById(id, isSuperAdmin ? null : institutionId);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Catalog item not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: item,
        });
    } catch (error) {
        console.error("Error fetching catalog item details:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const updateItem = async (req, res) => {
    const isSuperAdmin = req.user?.role === "super_admin";
    const institutionId = req.user?.institution_id || req.body.institution_id;
    const updatedBy = req.user?.id;

    if (!isSuperAdmin && !institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    try {
        const {
            id,
            name,
            sku,
            product_code,
        } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Item ID is required",
            });
        }

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Item name is required",
            });
        }

        const item = await CatalogItemModel.getItemById(id, isSuperAdmin ? null : institutionId);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Catalog item not found",
            });
        }

        const targetInstitutionId = item.institution_id;

        // Validate SKU duplicate
        if (sku) {
            const existingSku = await CatalogItemModel.findItemBySku(sku, targetInstitutionId);
            if (existingSku && existingSku.id !== parseInt(id)) {
                return res.status(409).json({
                    success: false,
                    message: `SKU '${sku}' already exists in your inventory`,
                });
            }
        }

        // Validate Product Code duplicate
        if (product_code) {
            const existingProductCode = await CatalogItemModel.findItemByProductCode(product_code, targetInstitutionId);
            if (existingProductCode && existingProductCode.id !== parseInt(id)) {
                return res.status(409).json({
                    success: false,
                    message: `Product Code '${product_code}' already exists in your inventory`,
                });
            }
        }

        const updatedItem = await CatalogItemModel.updateItem(
            id,
            targetInstitutionId,
            req.body,
            updatedBy
        );

        return res.status(200).json({
            success: true,
            message: "Catalog item updated successfully",
            data: updatedItem,
        });
    } catch (error) {
        console.error("Error updating catalog item:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const deleteItem = async (req, res) => {
    const isSuperAdmin = req.user?.role === "super_admin";
    const institutionId = req.user?.institution_id || req.body.institution_id;
    const { id } = req.body;

    if (!isSuperAdmin && !institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    if (!id) {
        return res.status(400).json({
            success: false,
            message: "Item ID is required",
        });
    }

    try {
        const item = await CatalogItemModel.getItemById(id, isSuperAdmin ? null : institutionId);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Catalog item not found or access denied",
            });
        }

        const deletedItem = await CatalogItemModel.deleteItem(id, item.institution_id);

        if (!deletedItem) {
            return res.status(404).json({
                success: false,
                message: "Item not found or deletion failed",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Catalog item deleted successfully",
            data: deletedItem,
        });
    } catch (error) {
        console.error("Error deleting catalog item:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const generateSku = async (req, res) => {
    const isSuperAdmin = req.user?.role === "super_admin";
    const institutionId = req.user?.institution_id || req.body.institution_id;

    if (!isSuperAdmin && !institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    try {
        const { category_id, name } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Item name is required to generate SKU",
            });
        }

        // 1. Resolve Category Code
        let catCode = "CAT";
        if (category_id) {
            const category = await CatalogCategoryModel.getCategoryById(category_id, institutionId);
            if (category) {
                catCode = category.category_code || category.category_name;
            }
        }

        // Format Category Code: alphanumeric only, uppercase, max 4 chars
        catCode = catCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        if (catCode.length > 4) catCode = catCode.substring(0, 4);
        if (!catCode) catCode = "CAT";

        // 2. Resolve Item Prefix
        // Split name into words, take first letters, or first 3 chars if single word
        const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, "").trim();
        const words = cleanName.split(/\s+/).filter(Boolean);
        let itemPrefix = "";

        if (words.length > 1) {
            // E.g. "Remote Control Car" -> "RCC"
            itemPrefix = words.slice(0, 3).map(w => w[0]).join("").toUpperCase();
        } else if (words.length === 1) {
            // E.g. "Doll" -> "DOL"
            itemPrefix = words[0].substring(0, 3).toUpperCase();
        }

        if (!itemPrefix) itemPrefix = "ITM";
        if (itemPrefix.length < 3) {
            itemPrefix = (itemPrefix + "XYZ").substring(0, 3);
        }

        // 3. Scan existing SKUs for sequential index
        // Sku pattern: CAT-ITM-
        const prefixPattern = `${catCode}-${itemPrefix}`;
        const existingSkus = await CatalogItemModel.getExistingSkusByPattern(institutionId, prefixPattern);

        let maxNum = 0;
        existingSkus.forEach(sku => {
            // extract the final numeric block
            const parts = sku.split("-");
            const finalPart = parts[parts.length - 1];
            const num = parseInt(finalPart, 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        });

        const nextNum = maxNum + 1;
        const paddedNum = String(nextNum).padStart(3, "0"); // e.g. 001, 002

        const generatedSku = `${prefixPattern}-${paddedNum}`;

        return res.status(200).json({
            success: true,
            sku: generatedSku,
        });
    } catch (error) {
        console.error("Error generating SKU:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

// Export Items to Clover formatted CSV
const exportItems = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;
    if (!institutionId) {
        return res.status(401).json({ success: false, message: "Unauthorized - Institution ID not found" });
    }

    try {
        const items = await CatalogItemModel.getItemList(institutionId);

        const headers = [
            "Clover ID", "Name", "Alternate Name", "Description", "Price", 
            "Price Type", "Price Unit", "Cost", "Product Code", "SKU", 
            "Quantity", "Hidden?", "Default tax rates?", "Non-revenue item?", 
            "Printer Labels", "Modifier Groups", "Categories", "Tax Rates", 
            "Variant Attribute", "Variant Option"
        ];

        const csvRows = items.map(item => ({
            "Clover ID": item.clover_id || "",
            "Name": item.name || "",
            "Alternate Name": item.alternate_name || "",
            "Description": item.description || "",
            "Price": item.price !== undefined ? `$${parseFloat(item.price).toFixed(2)}` : "",
            "Price Type": item.price_type || "Fixed",
            "Price Unit": item.price_unit || "",
            "Cost": item.cost !== undefined ? `$${parseFloat(item.cost).toFixed(2)}` : "",
            "Product Code": item.product_code || "",
            "SKU": item.sku || "",
            "Quantity": item.quantity !== undefined ? item.quantity : 0,
            "Hidden?": item.is_hidden || "No",
            "Default tax rates?": item.default_tax_rates || "Yes",
            "Non-revenue item?": item.is_non_revenue_item || "No",
            "Printer Labels": item.printer_labels || "",
            "Modifier Groups": item.modifier_groups || "",
            "Categories": item.category_name || "",
            "Tax Rates": item.tax_rates || "",
            "Variant Attribute": item.variant_attribute || "",
            "Variant Option": item.variant_option || ""
        }));

        const csvString = serializeCSV(headers, csvRows);

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=clover_inventory.csv");
        return res.status(200).send(csvString);
    } catch (error) {
        console.error("Export error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Import Items from Clover formatted CSV
const importItems = async (req, res) => {
    let institutionId = req.user?.institution_id || req.body.institution_id;
    const pgAdminId = req.user?.pg_admin_id || null;
    const createdBy = req.user?.id || null;

    if (!institutionId) {
        const instRes = await pool.query("SELECT id FROM institutions ORDER BY id ASC LIMIT 1");
        if (instRes.rows.length > 0) {
            institutionId = instRes.rows[0].id;
        }
    }

    if (!institutionId) {
        return res.status(400).json({ success: false, message: "No active institution found in database." });
    }

    if (!req.file) {
        return res.status(400).json({ success: false, message: "Please upload a CSV or Excel file" });
    }

    try {
        let csvData;
        const originalName = req.file.originalname.toLowerCase();
        if (originalName.endsWith(".xlsx") || originalName.endsWith(".xls")) {
            const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            csvData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        } else {
            const fileContent = req.file.buffer.toString("utf8");
            csvData = parseCSV(fileContent);
        }

        if (csvData.length === 0) {
            return res.status(400).json({ success: false, message: "Empty file content" });
        }

        // Dynamically find the header row (skipping instructions, blank lines, or metadata)
        let headerIndex = -1;
        for (let i = 0; i < Math.min(csvData.length, 100); i++) {
            const row = csvData[i];
            if (row && row.length > 0) {
                const rowStr = row.map(cell => cell ? String(cell).toLowerCase().trim() : "");
                if (rowStr.includes("name") && (rowStr.includes("clover id") || rowStr.includes("sku") || rowStr.includes("product code") || rowStr.includes("price") || rowStr.includes("categories"))) {
                    headerIndex = i;
                    break;
                }
            }
        }

        if (headerIndex === -1) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid file format - Could not find the header row. Make sure the file has a 'Name' and 'Clover ID' or 'SKU' column." 
            });
        }

        const headers = csvData[headerIndex].map(h => h ? String(h).trim() : "");
        const rows = csvData.slice(headerIndex + 1);

        let insertedCount = 0;
        let updatedCount = 0;
        let failedCount = 0;
        const errors = [];

        // Helper to resolve cell values with multiple possible aliases case-insensitively
        const getFieldValue = (rowData, aliases) => {
            for (const alias of aliases) {
                const foundKey = Object.keys(rowData).find(
                    key => key.trim().toLowerCase() === alias.toLowerCase()
                );
                if (foundKey && rowData[foundKey] !== undefined && rowData[foundKey] !== null) {
                    return String(rowData[foundKey]).trim();
                }
            }
            return "";
        };

        for (let idx = 0; idx < rows.length; idx++) {
            const row = rows[idx];
            if (row.length === 0 || (row.length === 1 && !row[0])) {
                continue;
            }

            const rowData = {};
            headers.forEach((header, index) => {
                if (header) {
                    const rawVal = row[index];
                    rowData[header] = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : "";
                }
            });

            const name = getFieldValue(rowData, ["Name", "Item Name", "Title", "Product Name"]);
            if (!name) {
                failedCount++;
                errors.push(`Row ${idx + 2}: Item Name is missing`);
                continue;
            }

            try {
                const cleanNumber = (val) => {
                    if (!val) return 0;
                    return parseFloat(val.replace(/[$,]/g, "")) || 0;
                };

                const price = cleanNumber(getFieldValue(rowData, ["Price", "price", "Rate"]));
                const cost = cleanNumber(getFieldValue(rowData, ["Cost", "cost", "Item Cost"]));
                const quantity = parseInt(getFieldValue(rowData, ["Quantity", "Qty", "quantity", "Quantity On Hand"]), 10) || 0;

                // Resolve category_id using aliases
                let categoryId = null;
                const categoryVal = getFieldValue(rowData, ["Categories", "Category", "Category ID", "category_id", "Category Name", "category_name"]);
                
                if (categoryVal) {
                    const directId = parseInt(categoryVal, 10);
                    if (!isNaN(directId)) {
                        const catRes = await pool.query(
                            `SELECT id FROM catalog_categories WHERE id = $1 AND institution_id = $2`,
                            [directId, institutionId]
                        );
                        if (catRes.rows.length > 0) {
                            categoryId = directId;
                        }
                    }

                    if (!categoryId) {
                        const category = await CatalogCategoryModel.findCategoryByName(categoryVal, institutionId);
                        if (category) {
                            categoryId = category.id;
                        } else {
                            if (isNaN(Number(categoryVal.trim()))) {
                                const code = categoryVal.replace(/\s+/g, "").substring(0, 4).toUpperCase();
                                const newCat = await CatalogCategoryModel.createCategory(
                                    institutionId,
                                    pgAdminId,
                                    categoryVal,
                                    code,
                                    "Auto-created during CSV import",
                                    "active",
                                    createdBy
                                );
                                categoryId = newCat.id;
                            }
                        }
                    }
                }

                // If still no category resolved, assign the first available category from the master list
                if (!categoryId) {
                    const fallbackRes = await pool.query(
                        `SELECT id FROM catalog_categories WHERE institution_id = $1 LIMIT 1`,
                        [institutionId]
                    );
                    if (fallbackRes.rows.length > 0) {
                        categoryId = fallbackRes.rows[0].id;
                    }
                }

                const cloverId = getFieldValue(rowData, ["Clover ID", "clover_id", "ID", "CloverID"]) || null;
                let sku = getFieldValue(rowData, ["SKU", "sku", "Barcode"]) || null;
                let productCode = getFieldValue(rowData, ["Product Code", "ProductCode", "product_code", "Code"]) || null;

                let existingItem = null;

                if (cloverId) {
                    const result = await pool.query(
                        `SELECT id FROM catalog_items WHERE clover_id = $1 AND institution_id = $2`,
                        [cloverId, institutionId]
                    );
                    if (result.rows.length > 0) {
                        existingItem = result.rows[0];
                    }
                }

                if (!existingItem && sku) {
                    existingItem = await CatalogItemModel.findItemBySku(sku, institutionId);
                }

                if (!existingItem && productCode) {
                    existingItem = await CatalogItemModel.findItemByProductCode(productCode, institutionId);
                }

                if (!existingItem && !sku) {
                    sku = await computeSequentialSku(institutionId, categoryId, name);
                }

                if (!productCode) productCode = sku;
                const barcode = sku;

                const formatBool = (val, defaultVal) => {
                    if (!val) return defaultVal;
                    const clean = val.toLowerCase();
                    if (clean === "yes" || clean === "true") return "Yes";
                    return "No";
                };

                const isHidden = formatBool(getFieldValue(rowData, ["Hidden?", "Hidden", "is_hidden"]), "No");
                const defaultTaxRates = formatBool(getFieldValue(rowData, ["Default tax rates?", "Default tax rates", "default_tax_rates"]), "Yes");
                const isNonRevenueItem = formatBool(getFieldValue(rowData, ["Non-revenue item?", "Non-revenue item", "is_non_revenue_item"]), "No");

                const itemData = {
                    clover_id: cloverId,
                    name,
                    alternate_name: getFieldValue(rowData, ["Alternate Name", "AlternateName", "alternate_name"]) || null,
                    description: getFieldValue(rowData, ["Description", "description", "details"]) || null,
                    price,
                    price_type: getFieldValue(rowData, ["Price Type", "PriceType", "price_type"]) || "Fixed",
                    price_unit: getFieldValue(rowData, ["Price Unit", "PriceUnit", "price_unit"]) || null,
                    cost,
                    product_code: productCode,
                    sku,
                    quantity,
                    is_hidden: isHidden,
                    default_tax_rates: defaultTaxRates,
                    is_non_revenue_item: isNonRevenueItem,
                    printer_labels: getFieldValue(rowData, ["Printer Labels", "PrinterLabels", "printer_labels"]) || null,
                    modifier_groups: getFieldValue(rowData, ["Modifier Groups", "ModifierGroups", "modifier_groups"]) || null,
                    category_id: categoryId,
                    unit_id: null,
                    tax_rates: getFieldValue(rowData, ["Tax Rates", "TaxRates", "tax_rates"]) || null,
                    variant_attribute: getFieldValue(rowData, ["Variant Attribute", "VariantAttribute", "variant_attribute"]) || null,
                    variant_option: getFieldValue(rowData, ["Variant Option", "VariantOption", "variant_option"]) || null,
                    barcode,
                    status: "active"
                };

                if (existingItem) {
                    await CatalogItemModel.updateItem(existingItem.id, institutionId, itemData, createdBy);
                    updatedCount++;
                } else {
                    await CatalogItemModel.createItem(institutionId, pgAdminId, itemData, createdBy);
                    insertedCount++;
                }
            } catch (err) {
                failedCount++;
                errors.push(`Row ${idx + 2} (${name}): ${err.message}`);
            }
        }

        return res.status(200).json({
            success: true,
            message: "Import finished successfully",
            summary: {
                total: rows.length,
                inserted: insertedCount,
                updated: updatedCount,
                failed: failedCount
            },
            errors
        });
    } catch (error) {
        console.error("Import error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const downloadTemplate = async (req, res) => {
    const { format } = req.query;

    const headers = [
        "Clover ID", "Name", "Alternate Name", "Description", "Price", 
        "Price Type", "Price Unit", "Cost", "Product Code", "SKU", 
        "Quantity", "Hidden?", "Default tax rates?", "Non-revenue item?", 
        "Printer Labels", "Modifier Groups", "Categories", "Tax Rates", 
        "Variant Attribute", "Variant Option"
    ];

    const sampleRow = {
        "Clover ID": "",
        "Name": "Test Item",
        "Alternate Name": "",
        "Description": "",
        "Price": "$0.00",
        "Price Type": "Fixed",
        "Price Unit": "1",
        "Cost": "$88.00",
        "Product Code": "CAT-TIX-001TST-001",
        "SKU": "CAT-TIX-001TST-001",
        "Quantity": "787",
        "Hidden?": "No",
        "Default tax rates?": "Yes",
        "Non-revenue item?": "No",
        "Printer Labels": "",
        "Modifier Groups": "",
        "Categories": "Puzzles & Games",
        "Tax Rates": "",
        "Variant Attribute": "",
        "Variant Option": ""
    };

    if (format === "excel") {
        try {
            const dataRows = [
                headers,
                headers.map(h => sampleRow[h])
            ];

            const workbook = xlsx.utils.book_new();
            const worksheet = xlsx.utils.aoa_to_sheet(dataRows);
            xlsx.utils.book_append_sheet(workbook, worksheet, "Template");

            const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", "attachment; filename=clover_inventory_template.xlsx");
            return res.status(200).send(buffer);
        } catch (error) {
            console.error("Template Excel download error:", error);
            return res.status(500).json({ success: false, message: error.message });
        }
    } else {
        try {
            const csvRows = [sampleRow];
            const csvString = "\uFEFF" + serializeCSV(headers, csvRows);

            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", "attachment; filename=clover_inventory_template.csv");
            return res.status(200).send(csvString);
        } catch (error) {
            console.error("Template CSV download error:", error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = {
    createItem,
    getItemList,
    getItemById,
    updateItem,
    deleteItem,
    generateSku,
    exportItems,
    importItems,
    downloadTemplate,
};
