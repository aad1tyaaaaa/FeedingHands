import { useState } from "react";
import {
  FaHeart,
  FaDollarSign,
  FaCreditCard,
  FaLock,
  FaUsers,
} from "react-icons/fa";
import "./PersonaTheme.css";
import "./FundraisingPage.css";

const FundraisingPage = () => {
  const [donationAmount, setDonationAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    cardNumber: "",
    expiry: "",
    cvc: "",
  });

  const handleSuccess = (e) => {
    e.preventDefault();
    // Handle form submission here
    console.log(formData);
    setSubmitted(true);
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      availability: "",
      skills: "",
    });
  };

  const presetAmounts = [10, 25, 50, 100, 250];

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle payment processing
    console.log({ donationAmount, paymentMethod, formData });
  };

  const handleAmountSelect = (amount) => {
    setSelectedAmount(amount);
    setDonationAmount(amount);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="fh-theme fundraising-page">
      <div className="fh-blob" aria-hidden="true" />
      <div className="fundraising-container fh-page">
        {/* Hero Section */}
        <div className="fundraising-hero">
          <div className="hero-content">
            <span className="fh-chip">Fundraiser</span>
            <h1 className="fh-title">
              Nourish Lives Through Your <em>Generosity</em> <FaHeart aria-hidden="true" />
            </h1>
            <p>Every dollar provides 5 meals to those in need</p>
          </div>
        </div>

        {/* Donation Section */}
        <div className="donation-content">
          {/* Impact Stats */}
          <div className="impact-stats">
            <div className="stat-card">
              <FaUsers className="stat-icon" aria-hidden="true" />
              <h3>25,000+</h3>
              <p>People Fed Monthly</p>
            </div>
            <div className="stat-card">
              <FaHeart className="stat-icon" aria-hidden="true" />
              <h3>1M+</h3>
              <p>Meals Provided</p>
            </div>
          </div>
          {/* Donation Form */}
          {submitted ? (
            <div className="success-message fh-card" role="status">
              <h2>Thank you for signing up!</h2>
            </div>
          ) : (
            <form className="donation-form fh-card" onSubmit={handleSubmit}>
              <div className="amount-selection">
                <h2>Select Donation Amount</h2>
                <div className="preset-amounts">
                  {presetAmounts.map((amount) => (
                    <button
                      type="button"
                      key={amount}
                      className={`amount-btn ${
                        selectedAmount === amount ? "selected" : ""
                      }`}
                      onClick={() => handleAmountSelect(amount)}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
                <div className="custom-amount">
                  <input
                    type="number"
                    aria-label="Other amount in rupees"
                    placeholder="Other amount"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                  />
                  <span className="fh-label">Rupees</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="payment-details">
                <h2>
                  <FaCreditCard /> Payment Information
                </h2>
                <div className="form-group">
                  <label className="fh-label" htmlFor="fr-name">Full Name</label>
                  <input
                    id="fr-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="fh-label" htmlFor="fr-email">Email</label>
                  <input
                    id="fr-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="fh-label" htmlFor="fr-card">Card Number</label>
                  <div className="card-input">
                    <FaCreditCard className="input-icon" aria-hidden="true" />
                    <input
                      id="fr-card"
                      type="text"
                      name="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={formData.cardNumber}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="card-info">
                  <div className="form-group">
                    <label className="fh-label" htmlFor="fr-expiry">Expiry Date</label>
                    <input
                      id="fr-expiry"
                      type="text"
                      name="expiry"
                      placeholder="MM/YY"
                      value={formData.expiry}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="fh-label" htmlFor="fr-cvc">CVC</label>
                    <div className="cvc-input">
                      <FaLock className="input-icon" aria-hidden="true" />
                      <input
                        id="fr-cvc"
                        type="text"
                        name="cvc"
                        placeholder="123"
                        value={formData.cvc}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit" className="donate-btn fh-btn">
                <FaDollarSign /> Donate Now
              </button>

              <div className="security-info">
                <FaLock className="lock-icon" />
                <span>Secure SSL Encryption • 100% Safe Donations</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default FundraisingPage;
