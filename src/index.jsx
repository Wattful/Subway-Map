import React, {useState, useEffect} from "react";
import {createRoot} from "react-dom/client"
import axios from "axios";
import {Subway} from "./render/subway.jsx";

const rpc = axios.create({
  baseURL: '//localhost:8000',
  withCredentials: false,
})

createRoot(document.getElementById("root")).render(<Subway/>);