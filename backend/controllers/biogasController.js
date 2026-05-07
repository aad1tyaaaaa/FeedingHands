import BiogasDonation from "../models/BiogasDonation.js";

export async function createBiogasDonation(req, res) {
  try {
    const donation = await BiogasDonation.create({
      food_type: req.body.food_type,
      quantity: req.body.quantity,
      address: req.body.address,
      date: req.body.date,
      contact_number: req.body.contact_number,
    });
    return res.status(201).json({ message: "Biogas donation created", donation });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function listBiogasDonations(_req, res) {
  try {
    const donations = await BiogasDonation.find().sort({ createdAt: -1 }).lean();
    return res.json({ donations });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
