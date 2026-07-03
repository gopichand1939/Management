import { Navigate, useLocation } from "react-router-dom";

const WeeklyFoodMenuView = () => {
  const location = useLocation();

  return (
    <Navigate
      to="/expense/weekly-food-menu"
      replace
      state={location.state}
    />
  );
};

export default WeeklyFoodMenuView;
