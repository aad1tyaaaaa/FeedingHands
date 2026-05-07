import { createContext, useState, useContext } from "react";

const DonationContext = createContext();

export const DonationProvider = ({ children }) => {
  const [totalDonations, setTotalDonations] = useState(0);

  const addDonation = () => {
    setTotalDonations((prev) => prev + 1);
  };

  return (
    <DonationContext.Provider value={{ totalDonations, addDonation }}>
      {children}
    </DonationContext.Provider>
  );
};

export const useDonation = () => useContext(DonationContext);
