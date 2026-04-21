import React from "react";
import {createRoot} from "react-dom/client";
import axios from "axios";
import {Subway} from "./subway.jsx";

axios.create({
    baseURL: "//localhost:8000",
    withCredentials: false,
});

createRoot(document.getElementById("root")).render(<Subway />);
