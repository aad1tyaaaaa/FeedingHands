import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { apiFetch } from "../api/client";

const DonationGraph = () => {
  const [data, setData] = useState([]);

  const fetchDonations = async () => {
    try {
      const response = await apiFetch("/api/donations");
      setData(response.donations || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchDonations();

    const interval = setInterval(fetchDonations, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="amount" stroke="#8884d8" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default DonationGraph;
