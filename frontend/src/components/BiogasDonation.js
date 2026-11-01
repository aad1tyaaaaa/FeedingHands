// import { useState } from "react";
// import {
//   FaRecycle,
//   FaLeaf,
//   FaTruckMoving,
//   FaChartLine,
//   FaQuestionCircle,
// } from "react-icons/fa";
// import "./BiogasDonation.css";

// const BiogasDonation = () => {
//   const [formData, setFormData] = useState({
//     wasteType: "",
//     quantity: "",
//     location: "",
//     pickupDate: "",
//     contact: "",
//   });

//   const [showFAQ, setShowFAQ] = useState(false);

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     // Handle form submission
//     console.log(formData);
//   };

//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   return (
//     <div className="biogas-container">
//       {/* Hero Section */}
//       <div className="biogas-hero">
//         <div className="hero-content">
//           <h1>
//             Transform Food Waste into Clean Energy <FaRecycle />
//           </h1>
//           <p>Donate your non-edible food waste to help generate biogas</p>
//         </div>
//       </div>

//       {/* Benefits Section */}
//       <div className="benefits-section">
//         <h2>
//           Why Donate Food Waste? <FaLeaf />
//         </h2>
//         <div className="benefits-grid">
//           <div className="benefit-card">
//             <div className="benefit-icon">♻️</div>
//             <h3>Reduce Landfill</h3>
//             <p>
//               Divert organic waste from landfills and reduce methane emissions
//             </p>
//           </div>
//           <div className="benefit-card">
//             <div className="benefit-icon">⚡</div>
//             <h3>Generate Energy</h3>
//             <p>1 ton of food waste can generate 300 kWh of electricity</p>
//           </div>
//           <div className="benefit-card">
//             <div className="benefit-icon">🌱</div>
//             <h3>Create Fertilizer</h3>
//             <p>Byproduct of biogas production enriches agricultural soil</p>
//           </div>
//         </div>
//       </div>

//       {/* Donation Form */}
//       <form className="donation-form" onSubmit={handleSubmit}>
//         <h2>
//           Schedule a Food Waste Pickup <FaTruckMoving />
//         </h2>

//         <div className="form-grid">
//           <div className="form-group">
//             <label>Type of Food Waste</label>
//             <select
//               name="wasteType"
//               value={formData.wasteType}
//               onChange={handleChange}
//               required
//             >
//               <option value="">Select waste type</option>
//               <option value="vegetable">Vegetable Scraps</option>
//               <option value="fruit">Fruit Waste</option>
//               <option value="dairy">Dairy Products</option>
//               <option value="other">Other Organic Waste</option>
//             </select>
//           </div>

//           <div className="form-group">
//             <label>Approximate Quantity</label>
//             <div className="quantity-input">
//               <input
//                 type="number"
//                 name="quantity"
//                 value={formData.quantity}
//                 onChange={handleChange}
//                 placeholder="0"
//                 required
//               />
//               <span>kilograms</span>
//             </div>
//           </div>

//           <div className="form-group">
//             <label>Pickup Location</label>
//             <input
//               type="text"
//               name="location"
//               value={formData.location}
//               onChange={handleChange}
//               placeholder="Enter address"
//               required
//             />
//           </div>

//           <div className="form-group">
//             <label>Preferred Pickup Date</label>
//             <input
//               type="date"
//               name="pickupDate"
//               value={formData.pickupDate}
//               onChange={handleChange}
//               required
//             />
//           </div>

//           <div className="form-group">
//             <label>Contact Number</label>
//             <input
//               type="tel"
//               name="contact"
//               value={formData.contact}
//               onChange={handleChange}
//               placeholder="Enter contact number"
//               required
//             />
//           </div>
//         </div>

//         <button type="submit" className="submit-btn">
//           Schedule Pickup
//         </button>
//       </form>

//       {/* Process Section */}
//       <div className="process-section">
//         <h2>
//           How It Works <FaChartLine />
//         </h2>
//         <div className="process-steps">
//           <div className="step">
//             <div className="step-number">1</div>
//             <h3>Schedule Pickup</h3>
//             <p>Fill our simple form to schedule a collection</p>
//           </div>
//           <div className="step">
//             <div className="step-number">2</div>
//             <h3>We Collect</h3>
//             <p>Our green vehicles collect your food waste</p>
//           </div>
//           <div className="step">
//             <div className="step-number">3</div>
//             <h3>Convert to Biogas</h3>
//             <p>Waste is processed in anaerobic digesters</p>
//           </div>
//           <div className="step">
//             <div className="step-number">4</div>
//             <h3>Distribute Energy</h3>
//             <p>Clean energy is added to the power grid</p>
//           </div>
//         </div>
//       </div>

//       {/* FAQ Section */}
//       <div className="faq-section">
//         <button className="faq-toggle" onClick={() => setShowFAQ(!showFAQ)}>
//           <FaQuestionCircle /> {showFAQ ? "Hide" : "Show"} FAQs
//         </button>
//         {showFAQ && (
//           <div className="faq-content">
//             <div className="faq-item">
//               <h3>What types of food waste can be donated?</h3>
//               <p>
//                 We accept all non-edible organic waste including vegetable
//                 peels, fruit cores, coffee grounds, and eggshells.
//               </p>
//             </div>
//             <div className="faq-item">
//               <h3>Is there a minimum quantity requirement?</h3>
//               <p>
//                 We accept donations of any size, but recommend at least 5kg for
//                 scheduled pickups.
//               </p>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default BiogasDonation;

import { useState } from "react";
import {
  FaRecycle,
  FaLeaf,
  FaTruckMoving,
  FaChartLine,
  FaQuestionCircle,
} from "react-icons/fa";
import "./BiogasDonation.css";
import { apiFetch } from "../api/client";

const BiogasDonation = () => {
  const [formData, setFormData] = useState({
    wasteType: "",
    quantity: "",
    location: "",
    pickupDate: "",
    contact: "",
  });
  const [showFAQ, setShowFAQ] = useState(false);

  const foodTypes = [
    "Vegetable Waste",
    "Fruit Waste",
    "Dairy Waste",
    "Meat Waste",
    "Other",
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch("/api/biogas-donations", {
        method: "POST",
        body: JSON.stringify({
          food_type: formData.wasteType,
          quantity: formData.quantity,
          address: formData.location,
          date: formData.pickupDate,
          contact_number: formData.contact,
        }),
      });
      alert("Submission Successful! 🎉");
      setFormData({
        wasteType: "",
        quantity: "",
        location: "",
        pickupDate: "",
        contact: "",
      });
    } catch (error) {
      console.error("Error inserting data:", error);
      alert(error.message || "Submission failed");
    }
  };

  return (
    <div className="biogas-container">
      {/* Hero Section */}
      <div className="biogas-hero">
        <div className="hero-content">
          <h1>
            Transform Food Waste into Clean Energy <FaRecycle />
          </h1>
          <p>Donate your non-edible food waste to help generate biogas</p>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="benefits-section">
        <h2>
          Why Donate Food Waste? <FaLeaf />
        </h2>
        <div className="benefits-grid">
          <div className="benefit-card">
            <h3>Reduce Landfill</h3>
            <p>
              Divert organic waste from landfills and reduce methane emissions
            </p>
          </div>
          <div className="benefit-card">
            <h3>Generate Energy</h3>
            <p>1 ton of food waste can generate 300 kWh of electricity</p>
          </div>
          <div className="benefit-card">
            <h3>Create Fertilizer</h3>
            <p>Byproduct of biogas production enriches agricultural soil</p>
          </div>
        </div>
      </div>

      {/* Donation Form */}
      <form className="donation-form" onSubmit={handleSubmit}>
        <h2>
          Schedule a Food Waste Pickup <FaTruckMoving />
        </h2>
        <div className="form-grid">
          <div className="form-group">
            <label>Type of Food Waste</label>
            <select
              name="wasteType"
              value={formData.wasteType}
              onChange={handleChange}
              required
            >
              <option value="">Select waste type</option>
              {foodTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Approximate Quantity (kg)</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Pickup Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Preferred Pickup Date</label>
            <input
              type="date"
              name="pickupDate"
              value={formData.pickupDate}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Contact Number</label>
            <input
              type="tel"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <button type="submit" className="submit-btn">
          Schedule Pickup
        </button>
      </form>

      {/* FAQ Section */}
      <div className="faq-section">
        <button className="faq-toggle" onClick={() => setShowFAQ(!showFAQ)}>
          <FaQuestionCircle /> {showFAQ ? "Hide" : "Show"} FAQs
        </button>
        {showFAQ && (
          <div className="faq-content">
            <div className="faq-item">
              <h3>What types of food waste can be donated?</h3>
              <p>
                We accept all non-edible organic waste including vegetable
                peels, fruit cores, coffee grounds, and eggshells.
              </p>
            </div>
            <div className="faq-item">
              <h3>Is there a minimum quantity requirement?</h3>
              <p>
                We accept donations of any size, but recommend at least 5kg for
                scheduled pickups.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BiogasDonation;
