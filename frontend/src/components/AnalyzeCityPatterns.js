import axios from "axios";

const analyzeCityPatterns = async () => {
  try {
    const response = await axios.post(
      "http://127.0.0.1:5000/analyze_city_patterns",
      {
        city: "mumbai",
        donation_data: [
          {
            donation_date: "2024-12-30",
            donation_time: "09:00",
            food_type: "rice",
            quantity_kg: 100,
            area_pincode: "400001",
            temperature: 30,
            humidity: 70,
            is_festival: false,
            city: "mumbai",
          },
          // Add more data if needed
        ],
      }
    );

    console.log("City Insights:", response.data);
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
  }
};

analyzeCityPatterns();
