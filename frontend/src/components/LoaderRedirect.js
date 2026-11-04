import { useNavigate } from "react-router-dom";
import LoadingScreen from "./LoadingScreen";
import { homeFor, useAuth } from "./AuthContext";

// The splash animation, then the right place: sign-in, role choice, or the user's dashboard.
const LoaderRedirect = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  return <LoadingScreen onLoaded={() => navigate(homeFor(user), { replace: true })} />;
};

export default LoaderRedirect;
