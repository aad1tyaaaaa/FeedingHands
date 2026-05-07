import Volunteer from "../models/Volunteer.js";

export async function createVolunteer(req, res) {
  try {
    const volunteer = await Volunteer.create({
      name: req.body.name,
      email: req.body.email || "",
      phone: req.body.phone || "",
      address: req.body.address || "",
    });
    return res.status(201).json({ message: "Volunteer registered", volunteer });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function listVolunteers(_req, res) {
  try {
    const volunteers = await Volunteer.find().sort({ createdAt: -1 }).lean();
    return res.json({ volunteers });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
