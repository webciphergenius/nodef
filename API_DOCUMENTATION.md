# FreightMate API Documentation

This document provides a detailed overview of the FreightMate backend API.

**Base URL:** `http://localhost:3000`

---

## Authentication

Most API endpoints require JWT-based authentication.

1.  **Get Token:** The user must first log in using the `POST /api/login` endpoint to receive a JWT token.
2.  **Send Token:** For all subsequent authenticated requests, the token must be included in the `Authorization` header.

**Header Format:** `Authorization: Bearer <YOUR_JWT_TOKEN>`

---

## User Management

Endpoints for user registration, authentication, and profile management.

### 1. Register User

Creates a new user account for either a "shipper" or a "driver".

- **Endpoint:** `POST /api/register`
- **Method:** `POST`
- **Authentication:** None
- **Request Type:** `multipart/form-data`

**Request Body:**

| Field               | Type   | Required | Description                                     |
| ------------------- | ------ | -------- | ----------------------------------------------- |
| `role`              | String | Yes      | "shipper" or "driver"                           |
| `first_name`        | String | Yes      | User's first name                               |
| `last_name`         | String | Yes      | User's last name                                |
| `phone`             | String | Yes      | User's phone number (must be unique)            |
| `username`          | String | Yes      | Desired username (must be unique)               |
| `password`          | String | Yes      | User's password                                 |
| `confirm_password`  | String | Yes      | Password confirmation                           |
| `email`             | String | No       | User's email address                            |
| `zipcode`           | String | No       | User's zip code                                 |
| `country`           | String | No       | User's country                                  |
| `address`           | String | No       | User's address                                  |
| `company`           | String | No       | Shipper's company name (for shippers)           |
| `vehicle_type`      | String | No       | Driver's vehicle type (for drivers)             |
| `vehicle_number`    | String | No       | Driver's vehicle number (for drivers)           |
| `load_capacity`     | String | No       | Driver's vehicle load capacity (for drivers)    |
| `license_file`      | File   | No       | Driver's license document (for drivers)         |
| `insurance_file`    | File   | No       | Driver's insurance document (for drivers)       |
| `registration_file` | File   | No       | Driver's vehicle registration doc (for drivers) |

**Success Response (201):**

```json
{
  "msg": "shipper registered. OTP sent to phone."
}
```

**Error Responses:**

- `400 Bad Request`: Missing required fields or passwords don't match.
- `409 Conflict`: Phone number or username already exists.

### 2. Verify OTP

Verifies the OTP sent to the user's phone after registration.

- **Endpoint:** `POST /api/verify-otp`
- **Method:** `POST`
- **Authentication:** None
- **Request Type:** `application/json`

**Request Body:**

```json
{
  "phone": "+1234567890",
  "otp": "123456"
}
```

**Success Response (200):**

```json
{
  "msg": "Phone verified successfully"
}
```

### 3. Resend OTP

- **Endpoint:** `POST /api/resend-otp`
- **Method:** `POST`
- **Authentication:** None
- **Request Type:** `application/json`
- **Body:** `{ "phone": "+1234567890" }`

### 4. Login User

- **Endpoint:** `POST /api/login`
- **Method:** `POST`
- **Authentication:** None
- **Request Type:** `application/json`

**Request Body:**

```json
{
  "phone": "+1234567890",
  "password": "userpassword",
  "device_token": "ExponentPushToken[LBFRCNEh8lfgTPy7QHE8cx]"
}
```

**Note:** `device_token` is optional and used for push notifications. If provided, it will be stored for the user to receive push notifications.

**Success Response (200):**

```json
{
  "msg": "Login successful",
  "token": "ey...",
  "user": {
    "id": 1,
    "role": "shipper",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890",
    "email": "john.doe@example.com"
    // ... other user fields
  },
  "userType": "shipper"
}
```

### 5. Get User Profile

- **Endpoint:** `GET /api/profile`
- **Method:** `GET`
- **Authentication:** Required

**Success Response (200):** Returns the full user object.

### 6. Update User Profile

- **Endpoint:** `PUT /api/profile`
- **Method:** `PUT`
- **Authentication:** Required
- **Request Type:** `multipart/form-data` (because of `profile_image`)

**Request Body:** Include any fields from the user model that need to be updated. The `profile_image` field should be a file.

### 7. Forgot/Reset Password

- `POST /api/forgot-password`: Sends an OTP to the user's phone.
- `POST /api/reset-password`: Resets the password using the provided OTP.

---

## Shipment Management

Endpoints for creating and managing shipments.

### 1. Create Shipment

- **Endpoint:** `POST /api/shipment/create`
- **Method:** `POST`
- **Authentication:** Required (Shipper role)
- **Request Type:** `multipart/form-data`

**Request Body:**

| Field                   | Type    | Required | Description                           |
| ----------------------- | ------- | -------- | ------------------------------------- |
| `vehicle_type`          | String  | Yes      | e.g., "Van", "Truck"                  |
| `pickup_zip`            | String  | Yes      |                                       |
| `pickup_location_name`  | String  | Yes      |                                       |
| `pickup_lat`            | String  | Yes      |                                       |
| `pickup_lng`            | String  | Yes      |                                       |
| `dropoff_zip`           | String  | Yes      |                                       |
| `dropoff_location_name` | String  | Yes      |                                       |
| `dropoff_lat`           | String  | Yes      |                                       |
| `dropoff_lng`           | String  | Yes      |                                       |
| `service_level`         | String  | Yes      | e.g., "Standard", "Express"           |
| `declared_value`        | Number  | Yes      | The value of the shipment for payment |
| `terms_acknowledged`    | Boolean | Yes      | Must be `true`                        |
| `package_instructions`  | String  | No       |                                       |
| `shipment_images`       | File[]  | No       | Array of images of the package        |

**Success Response (201):**

```json
{
  "msg": "Shipment created. Complete payment to proceed.",
  "shipment_identifier": "shipment-20240101-00001",
  "payment_url": "https://checkout.stripe.com/..."
}
```

### 2. List Available Shipments

- **Endpoint:** `GET /api/shipment/available`
- **Method:** `GET`
- **Authentication:** Required (Driver role)
- **Success Response (200):** Returns an array of shipment objects that are paid and have no assigned driver.

### 3. Accept a Shipment

- **Endpoint:** `POST /api/shipment/accept/:shipmentId`
- **Method:** `POST`
- **Authentication:** Required (Driver role)
- **Success Response (200):** `{ "msg": "Shipment accepted successfully" }`

### 4. List User's Shipments

- `GET /api/shipment/active`: (Shipper) Gets shipments created by the user that are paid.
- `GET /api/shipment/completed`: (Shipper) Gets shipments created by the user with status 'delivered'.
- `GET /api/shipment/accepted`: (Shipper or Driver) Gets all shipments that are currently in progress (accepted, picked_up, in_transit).

### 5. Update Shipment Status

- **Endpoints:**
  - `POST /api/shipment/mark-picked-up/:shipmentId`
  - `POST /api/shipment/mark-in-transit/:shipmentId`
  - `POST /api/shipment/mark-delivered/:shipmentId`
- **Method:** `POST`
- **Authentication:** Required (Driver role)

### 6. Get Dashboard Stats

- `GET /api/shipment/counts`: (Shipper) Returns counts of total, in-transit, completed, and pending shipments.
- `GET /api/shipment/driver/dashboard`: (Driver) Returns counts of total, completed, and in-transit shipments.

---

## Location Tracking

### 1. Update Driver Location

- **Endpoint:** `POST /api/shipment/:shipmentId/location`
- **Method:** `POST`
- **Authentication:** Required (Driver role)
- **Request Body:** `{ "latitude": 34.0522, "longitude": -118.2437 }`

### 2. Get Latest Shipment Location

- **Endpoint:** `GET /api/shipment/:shipmentId/location`
- **Method:** `GET`
- **Authentication:** Required

---

## Chat

### 1. Get Chat History

- **Endpoint:** `GET /api/chat/history`
- **Method:** `GET`
- **Authentication:** Required
- **Query Parameters:**
  - `userId`: The ID of the current user.
  - `otherUserId`: The ID of the other user in the conversation.
  - `shipmentID`: The ID of the shipment the chat is related to.

---

## Notifications

### 1. Get Notifications

- **Endpoint:** `GET /api/notifications`
- **Method:** `GET`
- **Authentication:** Required
- **Success Response (200):** Returns an array of notification objects for the user.

---

## Real-time Events (Socket.IO)

The app uses Socket.IO for real-time communication. The client should connect to the base URL (`http://localhost:3000`).

### 1. Joining the Server

A user must join the server with their user ID to receive private messages and notifications.

- **Event:** `join`
- **Payload:** `(userId)` - The ID of the logged-in user.
- **Example:** `socket.emit('join', 123);`

### 2. Private Messaging

- **Send a message:**
  - **Event:** `private_message`
  - **Payload:** `{ senderId, receiverId, message, shipmentId }`
- **Receive a message:**
  - **Event:** `private_message`
  - **Payload:** `{ senderId, message }`

### 3. Location Updates

- **Send a location update (Driver):**
  - **Event:** `location_update`
  - **Payload:** `{ shipmentId, driverId, latitude, longitude }`
- **Receive a location update (Shipper/Client):**
  - **Event:** `shipment_{shipmentId}_location`
  - **Payload:** `{ driverId, latitude, longitude, shipmentId, timestamp }`

---
