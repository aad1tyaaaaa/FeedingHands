import { useEffect, useState } from "react";
import { API_BASE_URL, getToken } from "../api/client";
import "./Tracking.css";

// Donation photos need the Bearer token, so an <img src> can't load them directly:
// fetch -> blob -> object URL, revoked when the photo unmounts.
function DonationPhoto({ donationId, photoId, alt }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url;
    let alive = true;
    fetch(`${API_BASE_URL}/api/donations/${donationId}/photos/${photoId}`, {
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    })
      .then((res) => (res.ok ? res.blob() : Promise.reject()))
      .then((blob) => {
        url = URL.createObjectURL(blob);
        if (alive) setSrc(url);
        else URL.revokeObjectURL(url);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [donationId, photoId]);

  if (failed) return <span className="donation-photo is-missing">Photo unavailable</span>;
  if (!src) return <span className="donation-photo is-loading" role="status" aria-label="Loading photo" />;
  return <img className="donation-photo" src={src} alt={alt} />;
}

// Every photo of a donation; nothing when it has none. small = table thumbnails.
export default function DonationPhotos({ donation, small = false }) {
  if (!donation.photos?.length) return null;
  return (
    <div className={`donation-photos${small ? " is-small" : ""}`}>
      {donation.photos.map((id, i) => (
        <DonationPhoto key={id} donationId={donation.id} photoId={id} alt={`${donation.type} donation, photo ${i + 1} of ${donation.photos.length}`} />
      ))}
    </div>
  );
}
