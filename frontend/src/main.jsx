/**
 * main.jsx — Application entry point.
 *
 * Wraps the App with necessary providers:
 * React Query, Web3 context, and React Router.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Web3Provider } from "./contexts/Web3Context";
import App from "./App";
import "./index.css";

/** React Query client with sensible defaults */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Web3Provider>
          <App />
        </Web3Provider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
