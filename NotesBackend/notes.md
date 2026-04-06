 ## npm create vite@6.5.0 .
 ## npm install
 ## npm run dev
 ## npm i react-router 
 ## npm i react-hot-toast
 
go to website of tailwind and docs    https://v3.tailwindcss.com/docs/guides/vite

### npm install -D tailwindcss@3 postcss autoprefixer
### npx tailwindcss init -p

@tailwind base;
@tailwind components;
@tailwind utilities;

in index .css


intailwind config 

import daisyui from "daisyui";
/** @type {import('tailwindcss').Config} */

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

https://v4.daisyui.com/docs/install/   2 tasks 

## npm i -D daisyui@v4

## npm install react-router-dom

in tailwind config add themes     
          plugins: [daisyui],
          daisyui:{
            themes: ["light"],
             }

at last do 
## npm run build

in app.jsx . in div add this data-theme="forest"





in main.jsx 

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>


    
      <App />
    </BrowserRouter>
  </StrictMode>
);



in app.jsx

import React from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "./things/homePage.jsx";

const App = () => {
  return (
    <>


      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </>
  );
};

export default App;

in things folder homepage.jsx

import React from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "./things/homePage.jsx";

const App = () => {
  return (
    <>


      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </>
  );
};

export default App;




### backend 

## python3 -m venv venv

##  source venv/bin/activate

##  pip install fastapi uvicorn python-dotenv

##   uvicorn index:app --reload
##
##
##