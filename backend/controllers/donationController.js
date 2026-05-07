import Donation from "../models/Donation.js";

function makeTrackingId() {
  return `FH-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function toClientDonation(doc) {
  if (!doc) return doc;
  const created = doc.createdAt || doc.created_at || doc.created;
  return {
    id: `${doc._id}`,
    type: doc.type,
    location: doc.location,
    latitude: doc.latitude ?? null,
    longitude: doc.longitude ?? null,
    contact: doc.contact || "",
    notes: doc.notes || "",
    foodDetails:
      typeof doc.foodDetails === "string" ? doc.foodDetails : JSON.stringify(doc.foodDetails ?? ""),
    donation_tracking_id: doc.donation_tracking_id,
    puniya_points: doc.puniya_points ?? 0,
    status: doc.status,
    status2: doc.status2,
    created_at: created ? new Date(created).toISOString() : null,
    updated_at: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
  };
}

export async function createDonation(req, res) {
  try {
    const payload = req.body || {};
    const donation = await Donation.create({
      type: payload.type || "food",
      location: payload.location || "",
      latitude: payload.latitude,
      longitude: payload.longitude,
      contact: payload.contact || "",
      notes: payload.notes || "",
      foodDetails: payload.foodDetails || payload.description || "",
      donor: req.user?.sub || null,
      status: payload.status || "available",
      status2: payload.status2 || "Pending pickup",
      puniya_points: payload.puniya_points ?? 10,
      donation_tracking_id: payload.donation_tracking_id || makeTrackingId(),
    });

    return res.status(201).json({
      message: "Donation created successfully",
      donation: toClientDonation(donation),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function listDonations(_req, res) {
  try {
    const docs = await Donation.find().sort({ createdAt: -1 });
    const donations = docs.map((d) => toClientDonation(d));
    return res.json({ donations });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function getDonationById(req, res) {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ message: "Donation not found" });
    return res.json({ donation: toClientDonation(donation) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function updateDonationStatus(req, res) {
  try {
    const { status, status2 } = req.body;
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ message: "Donation not found" });

    if (status) donation.status = status;
    if (status2) donation.status2 = status2;
    await donation.save();

    return res.json({ message: "Donation status updated", donation: toClientDonation(donation) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function getTrackingByTrackingId(req, res) {
  try {
    const donation = await Donation.findOne({
      donation_tracking_id: req.params.trackingId,
    }).select("donation_tracking_id status status2 updatedAt createdAt");

    if (!donation) return res.status(404).json({ message: "Tracking record not found" });
    return res.json({
      tracking: {
        donation_tracking_id: donation.donation_tracking_id,
        status: donation.status,
        status2: donation.status2,
        created_at: donation.createdAt ? new Date(donation.createdAt).toISOString() : null,
        updated_at: donation.updatedAt ? new Date(donation.updatedAt).toISOString() : null,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
