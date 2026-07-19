import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";

import App from "./App";
import { store } from "./Redux/Store";
import { I18nProvider } from "./Services/I18n/I18nService";
import "./styles.css";

// Global fetch interceptor to catch 401 (Session Terminated / Unauthorized) responses
const { fetch: originalFetch } = window;
window.fetch = async (...args) => {
  try {
    const response = await originalFetch(...args);
    if (response.status === 401) {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_auth_user");
      window.location.href = "/login";
    }
    return response;
  } catch (error) {
    throw error;
  }
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </Provider>
  </React.StrictMode>
);
