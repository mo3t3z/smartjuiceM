import { API_MANAGER } from "../../utils/api";
import StockBoutiqueView from "../../components/StockBoutiqueView";

export default function ManagerStockBoutique() {
  return <StockBoutiqueView apiUrl={`${API_MANAGER}/stock/boutique`} backPath="/manager/stocks" />;
}
