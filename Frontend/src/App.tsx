
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./components/Home/Home"
import Tables from "./components/Tables/Tables"
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tables" element={<Tables />} />
      </Routes>
    </BrowserRouter>
  );
}
