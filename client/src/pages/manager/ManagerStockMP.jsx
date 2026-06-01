import StockMPView from "../../components/StockMPView";
import { API_MANAGER } from "../../utils/api";

export default function ManagerStockMP() {
  return (
    <StockMPView
      apiUrlTypes={`${API_MANAGER}/stock/types-mp`}
      apiUrlStock={`${API_MANAGER}/stock/mp`}
      backPath="/manager/stocks"
    />
  );
}
