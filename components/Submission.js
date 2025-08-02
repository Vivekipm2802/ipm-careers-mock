import { useEffect, useState } from "react";
import styles from "./Submissions.module.css";
import { supabase } from "../utils/supabaseClient";
import { CSVLink, CSVDownload } from "react-csv";
import Head from "next/head";
import { createClient } from "@supabase/supabase-js";
import { Button, Checkbox, Input, Spinner } from "@nextui-org/react";
import { CtoLocal } from "@/utils/DateUtil";
import Link from "next/link";

function Submissions() {
  const supabaseUrl = "https://gbicgyfhacrwukeszfax.supabase.co";

  const supabaseServiceKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiaWNneWZoYWNyd3VrZXN6ZmF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwOTY2OTI2OCwiZXhwIjoyMDI1MjQ1MjY4fQ.9S-bkpn_fN02g-TRymhsqA97iUcp2qbrLwdkaRF8WgU";

  const supabase2 = createClient(supabaseUrl, supabaseServiceKey);
  const [leads, setLeads] = useState();
  const [date, setDate] = useState();
  const [form, setForm] = useState();
  const [selectedVa, setSelected] = useState([]);

  const [pagenumber, setPageNumber] = useState(0);
  const [count, setCount] = useState(15);

  function getFinalItems(a) {
    const startIndex = pagenumber * count;
    const endIndex = startIndex + count;

    // Ensure startIndex and endIndex are within valid bounds
    const validStartIndex = Math.max(0, Math.min(startIndex, a));
    const validEndIndex = Math.max(0, Math.min(endIndex, a));

    return a.slice(startIndex, endIndex);
  }
  function convertDateToISO(dateString) {
    console.log(dateString);
    const parts = dateString.split("-");

    // Ensure that the input is in the expected format
    if (parts.length !== 3) {
      throw new Error("Invalid date format. Please use dd-mm-yyyy.");
    }

    // Parse the date parts and create a new Date object
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10) - 1; // Months are 0-based in JavaScript
    const year = parseInt(parts[0], 10);

    const dateObject = new Date(year, month, day);

    // Check if the date is valid
    if (isNaN(dateObject.getTime())) {
      throw new Error("Invalid date.");
    }

    // Convert the Date object to ISO string
    const isoString = dateObject.toISOString();

    return isoString;
  }

  useEffect(() => {
    getLeads();
  }, []);

  async function getLeads(a, b) {
    const query = supabase2
      .from("admit_cards")
      .select(
        "id,created_at,name,phone,email,location,pluscode,map_url,url,category,appno,location"
      );
    setSelected([]);
    if (a != undefined && b != undefined) {
      query
        .gte("created_at", b)
        .lte("created_at", a)
        .order("created_at", { ascending: false });
    } else {
      query.order("created_at", { ascending: false }).limit(1000);
    }

    const { data, error } = await query;
    if (data) {
      setLeads(data);
    } else if (error) {
    }
  }

  function convertUTCtoDateStr(utcTime) {
    // Convert UTC time to a Date object
    return `${CtoLocal(utcTime).dayName} , ${CtoLocal(utcTime).date}  ${
      CtoLocal(utcTime).monthName
    }`;
  }

  function getCSVData(a) {
    const r = leads.filter((item) => a.includes(item.id));

    return r;
  }

  function updateSelection(bo, i) {
    if (bo == true) {
      setSelected((res) => [...res, i]);
    }
    if (bo == false) {
      const newArray = selectedVa.filter((item) => item !== i);
      setSelected(newArray);
    }
  }

  const headers = [
    { label: "Date", key: "created_at" },
    { label: "Full Name", key: "name" },
    { label: "Phone Number", key: "phone" },
    { label: "Email", key: "email" },
    { label: "PDF Link", key: "url" },
    { label: "Category", key: "category" },
    { label: "Map Link", key: "map_url" },
    { label: "Plus Code", key: "pluscode" },
    { label: "Application Number", key: "appno" },
    { label: "Location", key: "location" },
  ];

  return (
    <div className={styles.main}>
      <Head>
        <meta name="robots" content="noindex" />
      </Head>
      <h1 className={styles.heading + " !text-lg font-bold text-left "}>
        Admit Card Tool Submissions
      </h1>
      <div className={styles.dates}>
        <div>
          <label>Later than</label>
          <Input
            size="sm"
            placeholder="End Date"
            name="enddate"
            type="date"
            value={form?.end}
            onChange={(e) => {
              setForm((res) => ({ ...res, end: e.target.value }));
            }}
          ></Input>
        </div>
        <div>
          <label>Earlier than</label>
          <Input
            size="sm"
            placeholder="Start Date"
            name="startdate"
            type="date"
            value={form?.start}
            onChange={(e) => {
              setForm((res) => ({ ...res, start: e.target.value }));
            }}
          ></Input>
        </div>
        <Button
          size="sm"
          className={" bg-gradient-purple text-white"}
          onPress={() => {
            getLeads(
              convertDateToISO(form?.start),
              convertDateToISO(form?.end)
            );
          }}
        >
          Apply Filter
        </Button>

        {selectedVa != undefined && selectedVa?.length > 0 ? (
          <CSVLink
            data={selectedVa != undefined ? getCSVData(selectedVa) : []}
            headers={headers}
          >
            <Button size="sm" className="ml-2" color="secondary">
              Download CSV
            </Button>
          </CSVLink>
        ) : (
          ""
        )}
        {leads ? (
          <div className="ml-2 border-1 text-xs bg-gray-100 py-1 px-2 rounded-xl">
            Total Submissions: {leads.length}
          </div>
        ) : (
          ""
        )}
        {selectedVa && selectedVa?.length > 0 ? (
          <div className="mx-2 text-xs text-primary font-bold border-1 bg-gray-100 px-2 p-1 rounded-lg">
            {selectedVa.length} Selected
          </div>
        ) : (
          ""
        )}
      </div>
      <div className={styles.mainwrap}>
        <div className={styles.header}>
          <Checkbox
            onValueChange={(e) => {
              e == true ? setSelected(leads.map((i) => i.id)) : setSelected([]);
            }}
            color="secondary"
            type="checkbox"
          ></Checkbox>
          {headers &&
            headers.map((z, d) => {
              return (
                <h2 className=" !text-xs !text-left flex-1 text-ellipsis whitespace-nowrap">
                  {z.label}
                </h2>
              );
            })}
        </div>
        {leads == undefined ? <Spinner className="m-auto"></Spinner> : ""}

        {leads &&
          getFinalItems(leads).map((i, d) => {
            return (
              <div className={styles.lead}>
                <Checkbox
                  isSelected={selectedVa.some((item) => item == i.id)}
                  onValueChange={(e) => {
                    updateSelection(e, i.id);
                  }}
                  color="secondary"
                ></Checkbox>

                {headers &&
                  headers.map((z, d) => {
                    return (
                      <p className=" !text-xs !text-left flex-1 text-ellipsis whitespace-nowrap">
                        {z.key == "created_at" ? (
                          convertUTCtoDateStr(i[z?.key])
                        ) : z.key == "url" || z.key == "map_url" ? (
                          <Button
                            as={Link}
                            href={i[z.key] || "#"}
                            target="_blank"
                            size="sm"
                            color="secondary"
                            isIconOnly
                          >
                            <svg
                              width="24"
                              height="24"
                              fill="none"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M9 7a1 1 0 0 1 .117 1.993L9 9H7a3 3 0 0 0-.176 5.995L7 15h2a1 1 0 0 1 .117 1.993L9 17H7a5 5 0 0 1-.217-9.995L7 7h2Zm8 0a5 5 0 0 1 .217 9.995L17 17h-2a1 1 0 0 1-.117-1.993L15 15h2a3 3 0 0 0 .176-5.995L17 9h-2a1 1 0 0 1-.117-1.993L15 7h2ZM7 11h10a1 1 0 0 1 .117 1.993L17 13H7a1 1 0 0 1-.117-1.993L7 11h10H7Z"
                                fill="#fff"
                              />
                            </svg>
                          </Button>
                        ) : (
                          i[z?.key]?.toString().substring(0, 20)
                        )}
                      </p>
                    );
                  })}
              </div>
            );
          })}

        <div className={styles.paginate}>
          <div
            onClick={() => {
              setPageNumber((res) => res - 1);
            }}
            disabled={pagenumber && pagenumber > 0 ? false : true}
            className={styles.prev}
          >
            <svg
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15.707 4.293a1 1 0 0 1 0 1.414L9.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414l-7-7a1 1 0 0 1 0-1.414l7-7a1 1 0 0 1 1.414 0Z"
                fill="#000"
              />
            </svg>
          </div>
          {leads &&
            leads?.length &&
            Array(Math.ceil(leads?.length / count))
              .fill()
              .map((i, d) => {
                return (
                  <div
                    onClick={() => {
                      setPageNumber(d);
                    }}
                    className={
                      styles.page +
                      " " +
                      (d == pagenumber ? styles.pagination_active : "")
                    }
                  >
                    {d + 1}
                  </div>
                );
              })}
          <div
            className={styles.next}
            onClick={() => {
              setPageNumber((res) => res + 1);
            }}
            disabled={
              pagenumber != undefined &&
              pagenumber < Math.round(leads?.length / count) - 1
                ? false
                : true
            }
          >
            <svg
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8.293 4.293a1 1 0 0 0 0 1.414L14.586 12l-6.293 6.293a1 1 0 1 0 1.414 1.414l7-7a1 1 0 0 0 0-1.414l-7-7a1 1 0 0 0-1.414 0Z"
                fill="#000"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Submissions;
