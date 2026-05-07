import Organization from "../models/Organization.js";

export async function createOrganization(req, res) {
  try {
    const organization = await Organization.create({
      name: req.body.name,
      address: req.body.address,
      description: req.body.description || "",
      contact: req.body.contact || "",
      email: req.body.email || "",
      contactNumber: req.body.ContactNumber || req.body.contactNumber || "",
      latitude: req.body.latitude,
      longitude: req.body.longitude,
    });
    return res.status(201).json({ message: "Organization registered", organization });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function listOrganizations(_req, res) {
  try {
    const organizations = await Organization.find().sort({ createdAt: -1 }).lean();
    return res.json({ organizations });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
