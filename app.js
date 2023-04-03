/*
 * Starter Project for WhatsApp Echo Bot Tutorial
 *
 * Remix this as the starting point for following the WhatsApp Echo Bot tutorial
 *
 */

("use strict");

// Access token for your app
// (copy token from DevX getting started page
// and save it as environment variable into the .env file)
const token = process.env.WHATSAPP_TOKEN;
const version = process.env.VERSION;
const phoneNumberID = process.env.PHONE_NUMBER_ID;

// Imports dependencies and set up http server
const request = require("request"),
  express = require("express"),
  body_parser = require("body-parser"),
  axios = require("axios").default,
  app = express().use(body_parser.json()); // creates express http server

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log("webhook is listening"));

// Accepts POST requests at /webhook endpoint
app.post("/webhook", (req, res) => {
  // Parse the request body from the POST
  let body = req.body;

  // Check the Incoming webhook message
  console.log(JSON.stringify(req.body, null, 2));

  // info on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
  if (req.body.object) {
    if (
      req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0] &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0]
    ) {
      let phone_number_id =
        req.body.entry[0].changes[0].value.metadata.phone_number_id;
      let from = req.body.entry[0].changes[0].value.messages[0].from; // extract the phone number from the webhook payload
      if (from.toString().slice(0,2) === '54') {
        from = from.toString().substring(0,2) + '1' + from.toString().substring(3);
      }
      if (from.toString().length > 12) { // Si tiene más de 12 dígitos
        from = parseInt(from.toString().slice(0,2) + from.toString().slice(3)); // Elimina el tercer dígito
      }
      let msg_body = req.body.entry[0].changes[0].value.messages[0].text.body; // extract the message text from the webhook payload
      
      ////////
      /*
      axios({
        method: "POST", // Required, HTTP method, a string, e.g. POST, GET
        url:
          "https://graph.facebook.com/v12.0/" +
          phone_number_id +
          "/messages?access_token=" +
          token,
        data: {
          messaging_product: "whatsapp",
          to: from,
          text: { body: "Ack: " + msg_body },
        },
        headers: { "Content-Type": "application/json" },
      })
      .then((response) => {
        console.log("Message sent successfully");
        console.log(response.data);
      })
      .catch((error) => {
        console.error("Error sending message ACK:", error.response.data);
      });
      */ 
      
      //1. Error: El número registrado no contiene un 9 en la tercera posición, pero el que se envia la respuesta si lo tiene
      console.log("Número", from);
      console.log("Mensaje: ", msg_body);
      //Envio de la solicitud a OPENAI
      const message = msg_body;
      const openaiApiKey = process.env.OPENAI_API_KEY;
      const url = "https://api.openai.com/v1/chat/completions";
      const data = {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: message }],
        temperature: 0.7,
      };
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      };
      axios.post(url, data, { headers })
      .then((response)=>{
        const answer=response.data.choices[0].message.content;
        console.log("Respuesta del chat 1: ",answer);
        const url = `https://graph.facebook.com/${version}/${phoneNumberID}/messages`;
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };
        const data = {
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: {
            // the text object
            preview_url: false,
            body: answer,
          },
        };
        axios.post(url, data, { headers })
        .then((response)=>{
          console.log("Mensaje enviado correctamente al whatsapp",response );
        })
        .catch((error)=>{
          console.log("Error en la respuesta de Whatsapp: ",error);
        });
      })
      .catch((error)=>{
        console.log("Error al obtener la respuesta de openai",error);
      })
      //Enviar respuesta
      
    }
    res.sendStatus(200);
  } else {
    // Return a '404 Not Found' if event is not from a WhatsApp API
    res.sendStatus(404);
  }
});

// Accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
app.get("/webhook", (req, res) => {
  /**
   * UPDATE YOUR VERIFY TOKEN
   *This will be the Verify Token value when you set up webhook
   **/
  const verify_token = process.env.VERIFY_TOKEN;

  // Parse params from the webhook verification request
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === "subscribe" && token === verify_token) {
      // Respond with 200 OK and challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});
