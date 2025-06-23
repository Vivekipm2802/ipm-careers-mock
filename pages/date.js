import { parseDateTime, parseZonedDateTime ,parseAbsoluteToLocal} from "@internationalized/date";
import { DatePicker } from "@nextui-org/react";
import { useState } from "react";

export default function DatePick() {

const [date,setDate] = useState('2024-05-10 16:03:55.870776+00')

    const d = new Date(date).toISOString()
  const te = parseAbsoluteToLocal(d);



  return (
    <div>
      <DatePicker
        className="max-w-md"
        granularity="second"
        label="Date and time"
        value={te}
        onChange={(e)=>{setDate(e.toAbsoluteString())}}
      />
    </div>
  );
}
