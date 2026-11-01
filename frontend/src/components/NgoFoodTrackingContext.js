// import { createContext, useContext, useState, useEffect } from "react";
// import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(
//   "https://evrxtwxxwptqjhecthdv.supabase.co",
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cnh0d3h4d3B0cWpoZWN0aGR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkwODIzMDgsImV4cCI6MjA1NDY1ODMwOH0.QKuD5Wz8HxibrI_zpM-7BRq8KX7MHlYTZ9Yis_REmI0"
// );

// const NgoFoodTrackingContext = createContext();

// export const NgoFoodTrackingProvider = ({ children }) => {
//   const [currentStep, setCurrentStep] = useState(-1);
//   const [donationId, setDonationId] = useState(() => localStorage.getItem("currentDonationId") || null);
//   const [donationHistory, setDonationHistory] = useState(() => {
//     const savedHistory = localStorage.getItem("donationHistory");
//     return savedHistory ? JSON.parse(savedHistory) : [];
//   });

//   const steps = [
    
//     "Donation claimed",
//     "Accepted by Volunteer",
//     "Picked Up",
//     "Volunteer On the Way",

//     "Delivered ",
//   ];

//   useEffect(() => {
//     if (donationId) {
//       localStorage.setItem("currentDonationId", donationId);
//       fetchDonationStatus(donationId);
//     } else {
//       localStorage.removeItem("currentDonationId");
//       setCurrentStep(-1);
//     }
//   }, [donationId]);

//   const fetchDonationStatus = async (id) => {
//     if (!id) return;

//     try {
//       const { data, error } = await supabase
//         .from("donation")
//         .select("status2")
//         .eq("donation_tracking_id", id.toString())
//         .single();

//       if (error) {
//         console.error("Supabase error:", error);
//         setCurrentStep(-1);
//         return;
//       }

//       if (data) {
//         const stepIndex = steps.indexOf(data.status2);
//         setCurrentStep(stepIndex >= 0 ? stepIndex : 0);
//       }
//     } catch (err) {
//       console.error("Fetch error:", err);
//       setCurrentStep(-1);
//     }
//   };

//   useEffect(() => {
//     if (!donationId) return;

//     const channel = supabase
//       .channel("donation-tracking")
//       .on(
//         "postgres_changes",
//         {
//           event: "UPDATE",
//           schema: "public",
//           table: "donation",
//           filter: `donation_tracking_id=eq.${donationId}`,
//         },
//         (payload) => {
//           const stepIndex = steps.indexOf(payload.new.status2);
//           setCurrentStep(stepIndex >= 0 ? stepIndex : 0);
//           updateDonationHistory(payload.new.status2);
//         }
//       )
//       .subscribe();

//     return () => supabase.removeChannel(channel);
//   }, [donationId]);

//   const updateDonationHistory = (newStep) => {
//     setDonationHistory((prev) => {
//       const newHistory = [...new Set([...prev, newStep])];
//       localStorage.setItem("donationHistory", JSON.stringify(newHistory));
//       return newHistory;
//     });
//   };

//   const resetTracking = () => {
//     setDonationId(null);
//     setCurrentStep(-1);
//   };

//   const advanceToDonationPosted = () => {
//     setCurrentStep(1); // Assuming "Donation Posted" is the first step after "Pending"
//   };

//   return (
//     <NgoFoodTrackingContext.Provider
//       value={{
//         currentStep,
//         donationHistory,
//         donationId,
//         steps,
//         setDonationId,
//         fetchDonationStatus,
//         resetTracking,
//         advanceToDonationPosted,
//       }}
//     >
//       {children}
//     </NgoFoodTrackingContext.Provider>
//   );
// };

// export const NgouseFoodTracking = () => useContext(NgoFoodTrackingContext);

//New working
import { createContext, useContext, useState, useEffect } from "react";
import { apiFetch } from "../api/client";

const NgoFoodTrackingContext = createContext();

export const NgoFoodTrackingProvider = ({ children }) => {
  const [currentStep, setCurrentStep] = useState(-1);

  const [donationId, setDonationId] = useState(
    () => localStorage.getItem("currentDonationId") || null
  );

  const [donationHistory, setDonationHistory] = useState(() => {
    const savedHistory = localStorage.getItem("donationHistory");
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  const [isLoading, setIsLoading] = useState(false);

  const steps = [
    "Donation claimed",
    "Accepted by Volunteer",
    "Volunteer On the Way",
    "Picked Up",
    "Delivered to NGO",
    "Donation Successful",
  ];

  useEffect(() => {
    if (donationId) {
      localStorage.setItem("currentDonationId", donationId);
    } else {
      localStorage.removeItem("currentDonationId");
      setCurrentStep(-1);
    }
  }, [donationId]);

  const updateDonationHistory = (newStep) => {
    if (!newStep) return;

    setDonationHistory((prev) => {
      if (prev.includes(newStep)) return prev;

      const newHistory = [...prev, newStep];
      localStorage.setItem(
        "donationHistory",
        JSON.stringify(newHistory)
      );

      return newHistory;
    });
  };

  const fetchDonationStatus = async (id) => {
    if (!id) return null;

    if (isLoading) return null;

    setIsLoading(true);

    try {
      const data = await apiFetch(
        `/api/donations/tracking/${id}`
      );

      if (data?.tracking) {
        const stepIndex = steps.indexOf(
          data.tracking.status2
        );

        setCurrentStep(
          stepIndex >= 0 ? stepIndex : 0
        );

        updateDonationHistory(
          data.tracking.status2
        );

        return data.tracking;
      }

      return null;
    } catch (err) {
      if (
        err.message ===
        "Tracking record not found"
      ) {
        localStorage.removeItem(
          "currentDonationId"
        );

        localStorage.removeItem(
          "donationHistory"
        );

        setDonationId(null);
        setDonationHistory([]);
        setCurrentStep(-1);

        return null;
      }

      console.error(
        "Fetch error:",
        err
      );

      setCurrentStep(-1);

      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!donationId) return;

    fetchDonationStatus(donationId);

    const interval = setInterval(() => {
      fetchDonationStatus(donationId);
    }, 8000);

    return () => clearInterval(interval);
  }, [donationId]);

  const resetTracking = () => {
    localStorage.removeItem(
      "currentDonationId"
    );

    localStorage.removeItem(
      "donationHistory"
    );

    setDonationId(null);
    setDonationHistory([]);
    setCurrentStep(-1);
  };

  const advanceToDonationPosted = () => {
    setCurrentStep(0);
  };

  return (
    <NgoFoodTrackingContext.Provider
      value={{
        currentStep,
        donationHistory,
        donationId,
        steps,
        isLoading,
        setDonationId,
        fetchDonationStatus,
        resetTracking,
        advanceToDonationPosted,
      }}
    >
      {children}
    </NgoFoodTrackingContext.Provider>
  );
};

export const useNgoFoodTracking = () =>
  useContext(NgoFoodTrackingContext);


// import { createContext, useContext, useState, useEffect } from "react";
// import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(
//   "https://evrxtwxxwptqjhecthdv.supabase.co",
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cnh0d3h4d3B0cWpoZWN0aGR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkwODIzMDgsImV4cCI6MjA1NDY1ODMwOH0.QKuD5Wz8HxibrI_zpM-7BRq8KX7MHlYTZ9Yis_REmI0"
// );

// const NgoFoodTrackingContext = createContext();

// export const NgoFoodTrackingProvider = ({ children }) => {
//   const [currentStep, setCurrentStep] = useState(-1);
//   const [donationId, setDonationId] = useState(() => localStorage.getItem("currentDonationId") || null);
//   const [donationHistory, setDonationHistory] = useState(() => {
//     const savedHistory = localStorage.getItem("donationHistory");
//     return savedHistory ? JSON.parse(savedHistory) : [];
//   });

//   const steps = [
//     "Donation claimed",
//     "Accepted by Volunteer",
//     "Picked Up",
//     "Volunteer On the Way",
//     "Delivered",
//   ];

//   useEffect(() => {
//     if (donationId) {
//       localStorage.setItem("currentDonationId", donationId);
//       fetchDonationStatus(donationId);
//     } else {
//       localStorage.removeItem("currentDonationId");
//       setCurrentStep(-1);
//     }
//   }, [donationId]);

//   const fetchDonationStatus = async (id) => {
//     if (!id) return;

//     try {
//       const { data, error } = await supabase
//         .from("donation")
//         .select("status2")
//         .eq("donation_tracking_id", id.toString())
//         .single();

//       if (error) {
//         console.error("Supabase error:", error);
//         setCurrentStep(-1);
//         return;
//       }

//       if (data) {
//         const stepIndex = steps.indexOf(data.status2);
//         setCurrentStep(stepIndex >= 0 ? stepIndex : 0);
//       }
//     } catch (err) {
//       console.error("Fetch error:", err);
//       setCurrentStep(-1);
//     }
//   };

//   useEffect(() => {
//     if (!donationId) return;

//     const channel = supabase
//       .channel("donation-tracking")
//       .on(
//         "postgres_changes",
//         {
//           event: "UPDATE",
//           schema: "public",
//           table: "donation",
//           filter: `donation_tracking_id=eq.${donationId}`,
//         },
//         (payload) => {
//           const stepIndex = steps.indexOf(payload.new.status2);
//           setCurrentStep(stepIndex >= 0 ? stepIndex : 0);
//           updateDonationHistory(payload.new.status2);
//         }
//       )
//       .subscribe();

//     return () => supabase.removeChannel(channel);
//   }, [donationId]);

//   const updateDonationHistory = (newStep) => {
//     setDonationHistory((prev) => {
//       const newHistory = [...new Set([...prev, newStep])];
//       localStorage.setItem("donationHistory", JSON.stringify(newHistory));
//       return newHistory;
//     });
//   };

//   const resetTracking = () => {
//     setDonationId(null);
//     setCurrentStep(-1);
//   };

//   const advanceToDonationPosted = () => {
//     setCurrentStep(0); // "Donation claimed" is the first step
//   };

//   return (
//     <NgoFoodTrackingContext.Provider
//       value={{
//         currentStep,
//         donationHistory,
//         donationId,
//         steps,
//         setDonationId,
//         fetchDonationStatus,
//         resetTracking,
//         advanceToDonationPosted,
//       }}
//     >
//       {children}
//     </NgoFoodTrackingContext.Provider>
//   );
// };

// export const useNgoFoodTracking = () => useContext(NgoFoodTrackingContext);