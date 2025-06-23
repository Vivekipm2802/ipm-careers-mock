import { CtoLocal } from "@/utils/DateUtil";

const axios = require("axios");
export default async function LoginHandler(req, res) {
  if (req.method === "POST") {
    const a = req.body.record;
    console.log(a);

    axios
      .post(
        "https://api.interakt.ai/v1/public/track/users/",
        {
          phoneNumber: a.phone,
          countryCode: "+91",
          traits: {
            name: a.student_name,

            email: a.email,
          },
          tags: ['Push'],
        },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization:
              `Basic ${proces.env.NEXT_INTERAKT_KEY}`,
            "Access-Control-Allow-Origin": "*",
          },
        }
      )
      .then((reso) => {
        if (reso.data.result) {
          eventCall();
        }
      })
      .catch((reso) => {
        res.status(400).end();
      });

    async function eventCall() {
      axios
        .post(
          "https://api.interakt.ai/v1/public/track/events/",
          {
            phoneNumber: a.phone,
            countryCode: "+91",
            traits: {
              name: a.student_name,
              module: a.module_name,
              date: `${CtoLocal(a.datetime).dayName}, ${
                CtoLocal(a.datetime).date
              } ${CtoLocal(a.datetime).monthName} ${
                CtoLocal(a.datetime).year
              }`,
              time: `${CtoLocal(a.datetime).time} ${
                CtoLocal(a.datetime).amPm
              }`,
              email: a.email,
              link: a.schedules,
            },
            event: 'Push Notification',
            tags: ['Push'],
          },
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization:
                "Basic Y0MzaUJmSlF0bU1ib05SaEw0bS0yTlphYi15TnRfSEcwcll0TFZqXzlNODo=",
            },
          }
        )
        .then((reso) => {
          if (reso.data.result) {
            res.status(200).end();
          } else {
            res.status(400).end();
          }
        })
        .catch((reso) => {
          res.status(400).end();
        });
    }
  } else if (req.method === "GET") {
    res.status(200).json({ main: "something" });
  } else {
  }
}
