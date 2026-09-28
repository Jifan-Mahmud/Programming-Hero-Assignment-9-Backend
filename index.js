require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");

const app = express();
const port = process.env.PORT || 5000;
const url = process.env.MONGODB_URL;
const JWT_SECRET = process.env.JWT_SECRET || "studynook_jwt_secret_key_2026_cat12";

// Helper for default avatar
const getAvatarUrl = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=0D9488&color=fff&size=200`;

// Middleware
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL || "http://localhost:3000",
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const client = new MongoClient(url, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized access: Token missing" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized access: Invalid or expired token" });
  }
};

async function run() {
  try {
    await client.connect();
    console.log("Connected successfully to MongoDB!");

    const db = client.db("studynook_db");
    const usersCollection = db.collection("users");
    const roomsCollection = db.collection("rooms");
    const bookingsCollection = db.collection("bookings");

    // Auto-seed rooms if empty
    const roomCount = await roomsCollection.countDocuments();
    if (roomCount === 0) {
      const seedRooms = [
        {
          name: "Silent Oak Study Pod 304",
          description: "Ultra-quiet acoustically isolated study pod located in the main library west wing. Features ergonomic seating and warm lighting ideal for intensive study.",
          image: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80",
          floor: "3rd Floor",
          capacity: 4,
          hourlyRate: 8,
          amenities: ["Quiet Zone", "Wi-Fi", "Power Outlets", "Air Conditioning"],
          ownerId: "system_admin",
          ownerName: "Central Library Management",
          ownerEmail: "admin@studynook.edu",
          bookingCount: 12,
          createdAt: new Date(),
        },
        {
          name: "Innovation Lab & Projector Hub",
          description: "Spacious group discussion room equipped with high-definition digital projector, glass whiteboard, and modular tables for team projects.",
          image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
          floor: "2nd Floor",
          capacity: 8,
          hourlyRate: 15,
          amenities: ["Projector", "Whiteboard", "Wi-Fi", "Power Outlets", "Air Conditioning"],
          ownerId: "system_admin",
          ownerName: "Central Library Management",
          ownerEmail: "admin@studynook.edu",
          bookingCount: 19,
          createdAt: new Date(),
        },
        {
          name: "Glasshouse Executive Nook",
          description: "Sleek glass-partitioned single focus nook with panoramic campus garden view, dual monitor setup, and premium task chair.",
          image: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80",
          floor: "4th Floor",
          capacity: 2,
          hourlyRate: 6,
          amenities: ["Quiet Zone", "Wi-Fi", "Power Outlets", "Air Conditioning"],
          ownerId: "system_admin",
          ownerName: "Central Library Management",
          ownerEmail: "admin@studynook.edu",
          bookingCount: 8,
          createdAt: new Date(),
        },
        {
          name: "Collaborative Suite Alpha",
          description: "Designed for study groups and peer tutoring sessions. Includes full-wall whiteboard, fast Wi-Fi, and multiple charging stations.",
          image: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80",
          floor: "1st Floor",
          capacity: 6,
          hourlyRate: 12,
          amenities: ["Whiteboard", "Wi-Fi", "Power Outlets", "Air Conditioning"],
          ownerId: "system_admin",
          ownerName: "Central Library Management",
          ownerEmail: "admin@studynook.edu",
          bookingCount: 15,
          createdAt: new Date(),
        },
        {
          name: "Lakeside View Reading Alcove",
          description: "Serene alcove with comfortable armchairs and natural light. Perfect for reading research papers and deep focused work.",
          image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80",
          floor: "5th Floor",
          capacity: 2,
          hourlyRate: 7,
          amenities: ["Quiet Zone", "Wi-Fi", "Air Conditioning"],
          ownerId: "system_admin",
          ownerName: "Central Library Management",
          ownerEmail: "admin@studynook.edu",
          bookingCount: 5,
          createdAt: new Date(),
        },
        {
          name: "Media & Presentation Studio",
          description: "High-tech presentation studio with surround audio, modern digital projector, and magnetic whiteboard for practice lectures and group presentations.",
          image: "https://images.unsplash.com/photo-1568992687947-868a62a9f521?auto=format&fit=crop&w=800&q=80",
          floor: "2nd Floor",
          capacity: 10,
          hourlyRate: 20,
          amenities: ["Projector", "Whiteboard", "Wi-Fi", "Power Outlets", "Air Conditioning"],
          ownerId: "system_admin",
          ownerName: "Central Library Management",
          ownerEmail: "admin@studynook.edu",
          bookingCount: 22,
          createdAt: new Date(),
        },
      ];
      await roomsCollection.insertMany(seedRooms);
      console.log("Seeded initial study rooms into database!");
    }

    // AUTH ROUTES

    // Register
    app.post("/api/auth/register", async (req, res) => {
      try {
        const { name, email, photoURL, password } = req.body;

        if (!name || !email || !photoURL || !password) {
          return res.status(400).json({ message: "All fields are required" });
        }

        // Password validation: 6+ chars, 1 uppercase, 1 lowercase
        const passRegex = /^(?=.*[a-z])(?=.*[A-Z]).{6,}$/;
        if (!passRegex.test(password)) {
          return res.status(400).json({
            message:
              "Password must be at least 6 characters long and contain at least one uppercase letter and one lowercase letter.",
          });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await usersCollection.findOne({ email: normalizedEmail });
        if (existingUser) {
          return res.status(400).json({ message: "User already exists with this email" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userPhoto =
          photoURL && photoURL.trim() !== ""
            ? photoURL.trim()
            : getAvatarUrl(name);

        const newUser = {
          name: name.trim(),
          email: normalizedEmail,
          photoURL: userPhoto,
          password: hashedPassword,
          bookings: [],
          createdAt: new Date(),
        };

        const result = await usersCollection.insertOne(newUser);
        res.status(201).json({
          success: true,
          message: "Registration successful! Please login.",
          userId: result.insertedId,
        });
      } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: "Internal server error during registration" });
      }
    });

    // Login
    app.post("/api/auth/login", async (req, res) => {
      try {
        const { email, password } = req.body;
        if (!email || !password) {
          return res.status(400).json({ message: "Email and password are required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await usersCollection.findOne({ email: normalizedEmail });
        if (!user || !user.password) {
          return res.status(400).json({ message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(400).json({ message: "Invalid email or password" });
        }

        const finalPhoto = user.photoURL || getAvatarUrl(user.name);

        const tokenPayload = {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          photoURL: finalPhoto,
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "7d" });

        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({
          success: true,
          message: "Logged in successfully",
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            photoURL: finalPhoto,
          },
          token,
        });
      } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Internal server error during login" });
      }
    });

    // Google Login / OAuth handler
    app.post("/api/auth/google", async (req, res) => {
      try {
        const { name, email, photoURL } = req.body;
        if (!email) {
          return res.status(400).json({ message: "Email is required from Google auth" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        let user = await usersCollection.findOne({ email: normalizedEmail });

        const defaultUserPhoto = photoURL || getAvatarUrl(name || "Google User");

        if (!user) {
          const newUser = {
            name: name || "Google User",
            email: normalizedEmail,
            photoURL: defaultUserPhoto,
            bookings: [],
            createdAt: new Date(),
          };
          const result = await usersCollection.insertOne(newUser);
          user = { _id: result.insertedId, ...newUser };
        } else {
          // Update photo URL or name if user exists and photo was provided
          const updatedPhoto = photoURL || user.photoURL || getAvatarUrl(user.name);
          const updatedName = name || user.name;
          await usersCollection.updateOne(
            { _id: user._id },
            { $set: { photoURL: updatedPhoto, name: updatedName } }
          );
          user.photoURL = updatedPhoto;
          user.name = updatedName;
        }

        const tokenPayload = {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          photoURL: user.photoURL,
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "7d" });

        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({
          success: true,
          message: "Logged in via Google",
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            photoURL: user.photoURL,
          },
          token,
        });
      } catch (error) {
        console.error("Google Auth Error:", error);
        res.status(500).json({ message: "Google authentication failed" });
      }
    });

    // Get current user profile
    app.get("/api/auth/me", authMiddleware, async (req, res) => {
      try {
        const user = await usersCollection.findOne({ _id: new ObjectId(req.user.id) });
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        res.json({
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            photoURL: user.photoURL || getAvatarUrl(user.name),
          },
        });
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch user profile" });
      }
    });

    // Logout
    app.post("/api/auth/logout", (req, res) => {
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      });
      res.json({ success: true, message: "Logged out successfully" });
    });

    // ROOMS ROUTES

    // Get all rooms (with Search & Filter & Limit & Sort)
    app.get("/api/rooms", async (req, res) => {
      try {
        const { search, amenities, floor, minRate, maxRate, sort, limit } = req.query;

        const query = {};

        // Search by room name
        if (search && search.trim() !== "") {
          query.name = { $regex: search.trim(), $options: "i" };
        }

        // Filter by amenities ($in operator)
        if (amenities) {
          const amenitiesList = Array.isArray(amenities)
            ? amenities
            : amenities.split(",").map((a) => a.trim()).filter(Boolean);
          if (amenitiesList.length > 0) {
            query.amenities = { $in: amenitiesList };
          }
        }

        // Filter by floor
        if (floor && floor !== "all") {
          query.floor = { $regex: floor, $options: "i" };
        }

        // Filter by price ($gte, $lte)
        if (minRate || maxRate) {
          query.hourlyRate = {};
          if (minRate) query.hourlyRate.$gte = Number(minRate);
          if (maxRate) query.hourlyRate.$lte = Number(maxRate);
        }

        // Sorting
        let sortOption = { createdAt: -1 };
        if (sort === "price-asc") {
          sortOption = { hourlyRate: 1 };
        } else if (sort === "price-desc") {
          sortOption = { hourlyRate: -1 };
        } else if (sort === "popular") {
          sortOption = { bookingCount: -1 };
        }

        let cursor = roomsCollection.find(query).sort(sortOption);

        if (limit) {
          cursor = cursor.limit(parseInt(limit));
        }

        const rooms = await cursor.toArray();
        res.json(rooms);
      } catch (error) {
        console.error("Get Rooms Error:", error);
        res.status(500).json({ message: "Failed to fetch study rooms" });
      }
    });

    // Get my listings (Owner)
    app.get("/api/rooms/user/me", authMiddleware, async (req, res) => {
      try {
        const rooms = await roomsCollection
          .find({ ownerId: req.user.id })
          .sort({ createdAt: -1 })
          .toArray();
        res.json(rooms);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch user listings" });
      }
    });

    // Get single room details
    app.get("/api/rooms/:id", async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid Room ID" });
        }
        const room = await roomsCollection.findOne({ _id: new ObjectId(id) });
        if (!room) {
          return res.status(404).json({ message: "Room not found" });
        }
        res.json(room);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch room details" });
      }
    });

    // Create a new room (Owner)
    app.post("/api/rooms", authMiddleware, async (req, res) => {
      try {
        const { name, description, image, floor, capacity, hourlyRate, amenities } = req.body;

        if (!name || !description || !image || !floor || !capacity || !hourlyRate) {
          return res.status(400).json({ message: "Please fill in all required room fields." });
        }

        const newRoom = {
          name,
          description,
          image,
          floor: String(floor),
          capacity: Number(capacity),
          hourlyRate: Number(hourlyRate),
          amenities: Array.isArray(amenities) ? amenities : [],
          ownerId: req.user.id,
          ownerName: req.user.name,
          ownerEmail: req.user.email,
          bookingCount: 0,
          createdAt: new Date(),
        };

        const result = await roomsCollection.insertOne(newRoom);
        res.status(201).json({
          success: true,
          message: "Room added successfully",
          room: { _id: result.insertedId, ...newRoom },
        });
      } catch (error) {
        console.error("Add Room Error:", error);
        res.status(500).json({ message: "Failed to add study room" });
      }
    });

    // Update room (Owner only check)
    app.put("/api/rooms/:id", authMiddleware, async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid Room ID" });
        }

        const existingRoom = await roomsCollection.findOne({ _id: new ObjectId(id) });
        if (!existingRoom) {
          return res.status(404).json({ message: "Room not found" });
        }

        if (existingRoom.ownerId !== req.user.id) {
          return res.status(403).json({ message: "Forbidden: You can only edit your own rooms." });
        }

        const { name, description, image, floor, capacity, hourlyRate, amenities } = req.body;

        const updateDoc = {
          $set: {
            name: name || existingRoom.name,
            description: description || existingRoom.description,
            image: image || existingRoom.image,
            floor: floor ? String(floor) : existingRoom.floor,
            capacity: capacity ? Number(capacity) : existingRoom.capacity,
            hourlyRate: hourlyRate ? Number(hourlyRate) : existingRoom.hourlyRate,
            amenities: Array.isArray(amenities) ? amenities : existingRoom.amenities,
            updatedAt: new Date(),
          },
        };

        await roomsCollection.updateOne({ _id: new ObjectId(id) }, updateDoc);
        const updatedRoom = await roomsCollection.findOne({ _id: new ObjectId(id) });

        res.json({
          success: true,
          message: "Room updated successfully",
          room: updatedRoom,
        });
      } catch (error) {
        console.error("Update Room Error:", error);
        res.status(500).json({ message: "Failed to update study room" });
      }
    });

    // Delete room (Owner only check & $pull from user bookings)
    app.delete("/api/rooms/:id", authMiddleware, async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid Room ID" });
        }

        const room = await roomsCollection.findOne({ _id: new ObjectId(id) });
        if (!room) {
          return res.status(404).json({ message: "Room not found" });
        }

        if (room.ownerId !== req.user.id) {
          return res.status(403).json({ message: "Forbidden: You can only delete your own rooms." });
        }

        // Find related bookings
        const relatedBookings = await bookingsCollection
          .find({ roomId: new ObjectId(id) })
          .toArray();
        const bookingIds = relatedBookings.map((b) => b._id);

        // $pull room's booking IDs from any user's bookings array
        if (bookingIds.length > 0) {
          await usersCollection.updateMany(
            {},
            { $pull: { bookings: { $in: bookingIds } } }
          );
          await bookingsCollection.deleteMany({ roomId: new ObjectId(id) });
        }

        // Delete room document
        await roomsCollection.deleteOne({ _id: new ObjectId(id) });

        res.json({ success: true, message: "Room deleted successfully" });
      } catch (error) {
        console.error("Delete Room Error:", error);
        res.status(500).json({ message: "Failed to delete room" });
      }
    });

    // BOOKING SYSTEM ROUTES

    // Book a Room (Private + Time Conflict Detection + $push to user bookings array)
    app.post("/api/bookings", authMiddleware, async (req, res) => {
      try {
        const { roomId, date, startTime, endTime, specialNote } = req.body;

        if (!roomId || !date || !startTime || !endTime) {
          return res.status(400).json({ message: "Room, date, start time, and end time are required." });
        }

        if (!ObjectId.isValid(roomId)) {
          return res.status(400).json({ message: "Invalid Room ID" });
        }

        const room = await roomsCollection.findOne({ _id: new ObjectId(roomId) });
        if (!room) {
          return res.status(404).json({ message: "Room not found" });
        }

        // Validate time
        const startHour = parseInt(startTime.split(":")[0]);
        const endHour = parseInt(endTime.split(":")[0]);

        if (isNaN(startHour) || isNaN(endHour) || endHour <= startHour) {
          return res.status(400).json({ message: "End time must be after start time." });
        }

        // Double-booking Conflict Check:
        // Find existing confirmed bookings for this room on the given date
        const existingBookings = await bookingsCollection
          .find({
            roomId: new ObjectId(roomId),
            date: date,
            status: "confirmed",
          })
          .toArray();

        // Conflict condition: newStart < existEnd AND newEnd > existStart
        const hasConflict = existingBookings.some((b) => {
          const bStart = parseInt(b.startTime.split(":")[0]);
          const bEnd = parseInt(b.endTime.split(":")[0]);
          return startHour < bEnd && endHour > bStart;
        });

        if (hasConflict) {
          return res.status(409).json({
            message: "Conflict: This room is already booked for the selected time slot.",
          });
        }

        const totalHours = endHour - startHour;
        const totalCost = totalHours * room.hourlyRate;

        const newBooking = {
          roomId: new ObjectId(roomId),
          userId: req.user.id,
          userName: req.user.name,
          userEmail: req.user.email,
          date,
          startTime,
          endTime,
          totalCost,
          specialNote: specialNote || "",
          status: "confirmed",
          createdAt: new Date(),
        };

        const result = await bookingsCollection.insertOne(newBooking);
        const bookingId = result.insertedId;

        // Challenge requirement: Use $push operator to add booking ID to user's bookings array
        await usersCollection.updateOne(
          { _id: new ObjectId(req.user.id) },
          { $push: { bookings: bookingId } }
        );

        // Increment room booking count
        await roomsCollection.updateOne(
          { _id: new ObjectId(roomId) },
          { $inc: { bookingCount: 1 } }
        );

        res.status(201).json({
          success: true,
          message: "Room booked successfully!",
          booking: { _id: bookingId, ...newBooking },
        });
      } catch (error) {
        console.error("Booking Error:", error);
        res.status(500).json({ message: "Failed to create booking" });
      }
    });

    // Get My Bookings (Private + populated room data)
    app.get("/api/bookings/my", authMiddleware, async (req, res) => {
      try {
        const bookings = await bookingsCollection
          .find({ userId: req.user.id })
          .sort({ createdAt: -1 })
          .toArray();

        // Populate room details for each booking
        const populatedBookings = await Promise.all(
          bookings.map(async (b) => {
            const room = await roomsCollection.findOne({ _id: b.roomId });
            return {
              ...b,
              room: room
                ? {
                    id: room._id,
                    name: room.name,
                    image: room.image,
                    floor: room.floor,
                    hourlyRate: room.hourlyRate,
                  }
                : null,
            };
          })
        );

        res.json(populatedBookings);
      } catch (error) {
        console.error("Get Bookings Error:", error);
        res.status(500).json({ message: "Failed to fetch user bookings" });
      }
    });

    // Cancel Booking (Private + $pull operator from user bookings array)
    app.patch("/api/bookings/:id/cancel", authMiddleware, async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid Booking ID" });
        }

        const booking = await bookingsCollection.findOne({ _id: new ObjectId(id) });
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        if (booking.userId !== req.user.id) {
          return res.status(403).json({ message: "Forbidden: You can only cancel your own bookings." });
        }

        if (booking.status === "cancelled") {
          return res.status(400).json({ message: "Booking is already cancelled." });
        }

        // Update booking status
        await bookingsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: "cancelled", cancelledAt: new Date() } }
        );

        // Challenge requirement: Use $pull operator to remove booking ID from user's bookings array
        await usersCollection.updateOne(
          { _id: new ObjectId(req.user.id) },
          { $pull: { bookings: new ObjectId(id) } }
        );

        // Decrement room booking count
        if (booking.roomId) {
          await roomsCollection.updateOne(
            { _id: booking.roomId },
            { $inc: { bookingCount: -1 } }
          );
        }

        res.json({ success: true, message: "Booking cancelled" });
      } catch (error) {
        console.error("Cancel Booking Error:", error);
        res.status(500).json({ message: "Failed to cancel booking" });
      }
    });

    app.get("/", (req, res) => {
      res.send("StudyNook Server API is running smoothly!");
    });

    app.listen(port, () => {
      console.log(`StudyNook backend server listening on port ${port}`);
    });
  } catch (err) {
    console.error("MongoDB Connection Failed:", err);
  }
}

run().catch(console.dir);
