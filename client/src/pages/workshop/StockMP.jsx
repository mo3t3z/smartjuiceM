import StockMPView from "../../components/StockMPView";
import { API_WORKSHOP } from "../../utils/api";

export default function StockMP() {
  return (
    <StockMPView
      apiUrlTypes={`${API_WORKSHOP}/types-mp`}
      apiUrlStock={`${API_WORKSHOP}/matieres-premieres/disponible`}
      backPath="/workshop/stock"
    />
  );
}
