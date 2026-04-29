import { API_MANAGER } from "../../utils/api";
import StockPFView from "../../components/StockPFView";

export default function ManagerStockPF() {
  return <StockPFView apiUrl={`${API_MANAGER}/stock/pf`} backPath="/manager/stocks" />;
}
