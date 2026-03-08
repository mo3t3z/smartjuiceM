import mongoose from 'mongoose';

export async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connecté à MongoDB !");
    return mongoose.connection;
  } catch (error) {
    console.error("Erreur de connexion à MongoDB:", error.message);
    throw error;
  }
}
