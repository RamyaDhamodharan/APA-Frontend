import ReactDOM from "react-dom/client";
import { AppProviders } from "./app/providers";
import "./styles/globals.css";
import "./styles/modern.css";

ReactDOM.createRoot(document.getElementById("root")!).render(<AppProviders />);
