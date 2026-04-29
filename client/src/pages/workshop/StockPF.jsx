import { API_WORKSHOP } from "../../utils/api";
import StockPFView from "../../components/StockPFView";

export default function StockPF() {
  return <StockPFView apiUrl={`${API_WORKSHOP}/stock/pf/resume`} backPath="/workshop/stock" />;
}
