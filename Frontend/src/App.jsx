import { RouterProvider } from "react-router-dom";

import appRouter from "./Routes/AppRoutes";

const App = () => {
  return <RouterProvider router={appRouter} />;
};

export default App;
