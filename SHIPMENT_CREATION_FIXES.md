# Shipment Creation Issues - Fixes

## 🚨 **Current Issues**

### Issue 1: Database Column Missing

```
sqlMessage: "Unknown column 'pickup_name' in 'field list'"
```

### Issue 2: Multer Unexpected Field Error

```
MulterError: Unexpected field
```

## ✅ **Solutions**

### **Fix 1: Run Database Migration**

The new `pickup_name` and `dropoff_name` columns need to be added to the database:

```bash
# In production environment
node add-location-name-fields.js
```

This will add:

- `pickup_name VARCHAR(255) NULL`
- `dropoff_name VARCHAR(255) NULL`

### **Fix 2: Multer Configuration Updated**

I've updated the Multer configuration to:

- ✅ Handle larger file sizes (20MB)
- ✅ Allow more fields (100 fields)
- ✅ Better error handling with specific error messages
- ✅ Debug logging for unexpected fields

### **Fix 3: Frontend Form Data**

Make sure your frontend is sending the correct field names:

**✅ Correct Form Data:**

```javascript
const formData = new FormData();

// Required fields
formData.append("vehicle_type", "CAR");
formData.append("pickup_zip", "20740");
formData.append("pickup_lat", "39.0107574");
formData.append("pickup_lng", "-76.9160527");
formData.append("dropoff_zip", "20740");
formData.append("dropoff_lat", "39.0115901");
formData.append("dropoff_lng", "-76.9187049");
formData.append("service_level", "standard");
formData.append("declared_value", "25.75");
formData.append("terms_acknowledged", "1");
formData.append("recipient_mobile", "+11201741488");

// Optional fields
formData.append(
  "pickup_location_name",
  "5121 Lackawanna St, College Park, MD, USA"
);
formData.append("pickup_name", "Park Avenue"); // NEW FIELD
formData.append(
  "dropoff_location_name",
  "5100 Lackawanna St, College Park, MD, USA"
);
formData.append("dropoff_name", "Chargerszilla"); // NEW FIELD
formData.append("package_instructions", "Box with LCDs");

// File uploads (multiple files)
formData.append("shipment_images", file1);
formData.append("shipment_images", file2);
// ... more files
```

**❌ Common Mistakes:**

- Don't send `shipment_images` as a single field with multiple files
- Don't send unexpected field names
- Don't send files with wrong field names

## 🔍 **Debugging Steps**

### 1. Check Database Schema

```sql
DESCRIBE shipments;
```

Look for:

- `pickup_name` column
- `dropoff_name` column

### 2. Check Multer Error Logs

The updated error handler will now show:

```
Multer Error: [error details]
Unexpected field: [field name]
```

### 3. Test with Minimal Data

Try creating a shipment with just required fields first:

```javascript
const minimalFormData = new FormData();
minimalFormData.append("vehicle_type", "CAR");
minimalFormData.append("pickup_zip", "20740");
minimalFormData.append("pickup_lat", "39.0107574");
minimalFormData.append("pickup_lng", "-76.9160527");
minimalFormData.append("dropoff_zip", "20740");
minimalFormData.append("dropoff_lat", "39.0115901");
minimalFormData.append("dropoff_lng", "-76.9187049");
minimalFormData.append("service_level", "standard");
minimalFormData.append("declared_value", "25.75");
minimalFormData.append("terms_acknowledged", "1");
minimalFormData.append("recipient_mobile", "+11201741488");
```

## 🚀 **Next Steps**

1. **Run the migration script** in production
2. **Update your frontend** to use correct field names
3. **Test with the new error handling** to identify any remaining issues
4. **Check the logs** for specific error messages

## 📋 **Expected Result**

After fixes, you should see:

- ✅ Successful shipment creation
- ✅ New fields stored in database
- ✅ Multiple images uploaded correctly
- ✅ Clear error messages if issues occur

## 🔧 **Files Updated**

- `routes/shipmentRoutes.js` - Better Multer configuration and error handling
- `add-location-name-fields.js` - Database migration script
- `controllers/shipmentController.js` - Already updated with new fields
