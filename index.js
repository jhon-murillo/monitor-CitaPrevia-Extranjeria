const puppeteer = require("puppeteer");
const axios = require("axios");
const jsdom = require("jsdom");
const https = require("https");

const gwebhook = "https://discord.com/api/webhooks/1005510516787122186/Sm8K1r1VFX1WRccyseCYWB91j_5x5G9DzbSfloWWx3k-fqszzMJC1UYUczKra1xN-Sva";
// async sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getSession() {
  var gbody = "";
  var cookies = [];
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.on("request", async (request) => {
    const url = request.url();
    const body = await request.postData();
    if (
      url.includes("icp.administracionelectronica.gob.es/icpplustieb/acCitar")
    ) {
      gbody = body;
      var _cookies = await request.client.send("Network.getAllCookies");

      cookies = _cookies.cookies;
    }
    
  });
  await page.goto(
    "https://icp.administracionelectronica.gob.es/icpplustieb/citar?p=12&locale=es",
    { waitUntil: "networkidle0" }
  );

  const options = await page.evaluate(() => {
    const oficina = document.querySelector(".mf-input__xl");
    const oficina_options = oficina.querySelectorAll("option");
    const selected_oficina_option = [...oficina_options].find(
      (option) => option.value === "99"
    );

    if (selected_oficina_option) selected_oficina_option.selected = true;
    cargaMensajesTramite();

    return { oficina: oficina_options };
  });
  console.log(options);
  await page.waitForNavigation({
    waitUntil: "networkidle0",
  });
  await sleep(1000);

  await page.evaluate(() => {
    const tramite = document.querySelector(".mf-input__l");
    const tramite_options = tramite.querySelectorAll("option");
    const selected_tramite_option = [...tramite_options].find(
      (option) => option.value === "4010"
    );

    if (selected_tramite_option) selected_tramite_option.selected = true;
    eliminarSeleccionOtrosGrupos(0);
    cargaMensajesTramite();
    return { tramite: tramite_options };
  });
  await sleep(1000);

  await page.evaluate(() => {
    envia();
  });

  await page.waitForNavigation({
    waitUntil: "networkidle0",
  });
  await sleep(1000);

  await page.evaluate(() => {
    document.forms[0].submit();
  });

  await page.waitForNavigation({
    waitUntil: "networkidle0",
  });
  await sleep(1000);
  await page.evaluate(() => {
    const nie = document.querySelector("#txtIdCitado");
    if (nie) nie.value = 'X6571147R';
    const nombre = document.querySelector("#txtDesCitado");
    if (nombre) nombre.value = 'JUAN PABLO';

    envia();
  });
  await page.waitForNavigation({
    waitUntil: "networkidle0",
  });
  await sleep(1000);

  await page.evaluate(() => {
    enviar("solicitud");
  });
  await page.waitForNavigation({
    waitUntil: "networkidle0",
  });
  await sleep(500);


  // sleep
  await browser.close();
  return { gbody, cookies };
}

var citas = [];

async function main() {
  var { gbody, cookies } = await getSession();
  while (1) {
    try {
      var cookiesStr = cookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");

        
      var config = {
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
        }),
        method: "post",
        url: "https://icp.administracionelectronica.gob.es/icpplustieb/acCitar",
        headers: {
          Accept: "text/html; charset=utf-8",
          "Accept-Charset": "UTF-8",
          "Accept-Language": "en-US;q=0.7",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Content-Length": "111",
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookiesStr,
          Host: "icp.administracionelectronica.gob.es",
          Origin: "https://icp.administracionelectronica.gob.es",
          Pragma: "no-cache",
          Referer:
            "https://icp.administracionelectronica.gob.es/icpplustieb/acValidarEntrada",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "same-origin",
          "Sec-Fetch-User": "?1",
          "Sec-GPC": "1",
          "Upgrade-Insecure-Requests": "1",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.134 Safari/537.36",
        },
        //   responseType: 'arraybuffer',
        //   reponseEncoding: 'binary',
        data: gbody,
      };
      const response = await axios(config);
      if (response.status !== 200) {
        await sleep(35 * 1000);
        console.log(`[${date}] -> generating new headers`);
        ({ gbody, cookies } = await getSession());
        continue;
      }

      const dom = new jsdom.JSDOM(response.data);
      const $ = require("jquery")(dom.window);
      const options = $(".mf-input__xl option");
      if (options.length > 0) {
        var new_citas = [];
        $.map(options, function (option) {
          if(!option.text.includes('Seleccionar')) new_citas.push({ oficina: option.value, oficina_name: option.text });
        });
        // spot changes between citas and new_citas, deleted and added
        var deleted = citas.filter((cita) => !new_citas.find((new_cita) => new_cita.oficina === cita.oficina));
        var added = new_citas.filter((new_cita) => !citas.find((cita) => cita.oficina === new_cita.oficina));

        
        var date = new Date().toLocaleString();

        citas = new_citas;
        if (deleted.length)console.log(`[${date}] -> Deleted: ${deleted.length}`);
        if (added.length) console.log(`[${date}] -> Added: ${added.length}`);

        if(added.length || deleted.length) {
            // send webhook discord axios
          try{
            const webhook = {
                method: "post",
                url: gwebhook,
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.134 Safari/537.36",
                },
                data: {
                    content: `[${date}] -> Deleted: ${deleted.length} | Added: ${added.length}\nCitas:\n${citas
                        .map((cita, index) => `${index + 1} - ${cita.oficina_name}`)
                        .join("\n")}`,
                },
            };
            await axios(webhook);
          }
          catch(error){
            console.log('webhook error:',(error?.message || error?.status));
          }
            

        }
        
        
        console.log(
          `[${date}] -> Citas:\n ${citas
            .map((cita, index) => `\t${index + 1} - ${cita.oficina_name}`)
            .join("\n")}`
        );
      }

      

      const res = $(".mf-msg__info").text();
      if (res) {
        var date = new Date().toLocaleString();
        if (res.includes("no hay citas disponibles")) {
          citas = [];
          console.log(`[${date}] -> No disponible`);
        }
        // if session expires
        else if (res.includes("Su sesión ha caducado")) {
          console.log(`[${date}] -> Caducado`);
          await sleep(35 * 1000);

          console.log(`[${date}] -> generating new headers`);
          ({ gbody, cookies } = await getSession());
          continue;
        }
        // if session is valid
        else {
          // print datetimetime and response
          console.log(`[${date}] -> ${res}`);

          
        }
      }
    } catch (error) {
      console.log("error: " + (error?.message || error?.status));
      if (error?.status === 429) console.log(`[${date}] -> BAN CHANGE IP`);
      await sleep(35 * 1000);
      console.log(`[${date}] -> generating new headers`);
      ({ gbody, cookies } = await getSession());
      continue;
    }
    await sleep(35 * 1000);
  }
}

main();
