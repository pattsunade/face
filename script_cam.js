const ObjVideo = document.getElementById('video');
const ObjFoto = document.getElementById('foto');
//Botones
const BtnSacaFoto = document.getElementById('sacafoto');
const BtnComparar = document.getElementById('comparar');
const BtnDetener = document.getElementById('detener');
const BtnLimpiar = document.getElementById('limpiar');

const directorio = '/models';

Promise.all([
  faceapi.nets.faceLandmark68Net.loadFromUri(directorio),
  faceapi.nets.faceRecognitionNet.loadFromUri(directorio),
  faceapi.nets.tinyFaceDetector.loadFromUri(directorio),
  faceapi.nets.faceExpressionNet.loadFromUri(directorio),
  faceapi.nets.ssdMobilenetv1.loadFromUri(directorio),
  faceapi.nets.ageGenderNet.loadFromUri(directorio),
]).then(init)

var TipoCamara="user";// user = camara frontal, environment = camara delantera
var Velocidad=1000;//Velocidad de video milisegundos
var Restricciones = { video: {width: ObjVideo.width , height: ObjVideo.height, facingMode: {exact: TipoCamara}}, audio: false, autoplay : true };

/*****Muestra cuadros descriptivos de reconocimiento facial*****/
ObjVideo.addEventListener('play', () => {
  let StreamVideo = faceapi.createCanvasFromMedia(ObjVideo)
  document.body.append(StreamVideo)
  const displaySize = { width: ObjVideo.width, height: ObjVideo.height }
  faceapi.matchDimensions(StreamVideo, displaySize)
    setInterval(async () =>
      {
        let detections = await faceapi.detectAllFaces(ObjVideo, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions()
        let resizedDetections = faceapi.resizeResults(detections, displaySize)
        StreamVideo.getContext('2d').clearRect(0, 0, StreamVideo.width, StreamVideo.height)
        faceapi.draw.drawDetections(StreamVideo, resizedDetections)//cuadro reconocimiento de rostro
        faceapi.draw.drawFaceExpressions(StreamVideo, resizedDetections)//muestra emociones
        faceapi.draw.drawFaceLandmarks(StreamVideo, resizedDetections)//puntos comparativos de rostro
      }, Velocidad)
})

/*****Acceso a webCam 1 de 2*****/
async function init() {
  try {
    let stream = await navigator.mediaDevices.getUserMedia(Restricciones);
    handleSuccess(stream);
  } catch (e) {
    console.log("error webcam");
  }
}

/*****Acceso a webCam 2 de 2*****/
function handleSuccess(stream) {
  window.stream = stream;
  ObjVideo.srcObject = stream;
}

/*****Botón detiene video*****/
BtnDetener.addEventListener("click", function () 
{
  ObjVideo.srcObject.getTracks()[0].stop()
  ObjVideo.removeEventListener('play', () =>
    { 
      true
    });
  BtnComparar.removeEventListener('click', () =>
    { 
      true
    });
  var contexto = ObjFoto.getContext("2d");
  contexto.clearRect(0, 0, ObjVideo.width, ObjVideo.height);

  delete faceMatcher;
  delete singleResult;
  delete bestMatch;
  delete results;
  delete worker;
  delete stream;
  delete resizedDetections;
  delete detections;
  delete context;
});

/*****Botón Limpiar TexTarea*****/
  BtnLimpiar.addEventListener("click", function () {
       document.getElementById("resultado").innerHTML = ''     
  });

/*****Botón Sacar foto*****/
  var context = ObjFoto.getContext('2d');
  BtnSacaFoto.addEventListener("click", async function () {
    BtnComparar.disabled = true
    BtnSacaFoto.disabled = true
    context.drawImage(ObjVideo, 0, 0, ObjVideo.width, ObjVideo.height);
   //Chequea si en la imagen sacada existe rostro
    var chequeaRostro = await faceapi.detectSingleFace(ObjFoto).withFaceLandmarks().withFaceDescriptor()  
    if (!chequeaRostro)
    { 
      BtnSacaFoto.disabled = false
      console.log('No encuentro rostro en la imagen')
      document.getElementById("resultado").innerHTML += 'No encuentro rostro en la imagen' +'\n'  
    } 
    else
    {
      let worker = await new Tesseract.TesseractWorker();
      worker
        .recognize(ObjFoto, 'spa')
          .then((result) => {
          //si contiene RUN, UN, BLICA, CHILE
          if(result.text.includes("RUN") || result.text.includes("UN") || result.text.includes("BLICA") || result.text.includes("CHILE"))
            {
              BtnSacaFoto.disabled = false
              BtnComparar.disabled = false
              console.log('Se encontró rostro y es una CI')//result.text
              document.getElementById("resultado").innerHTML += 'Se encontró rostro y es una CI' +'\n'  
              window.alert("Es una CI");
            }
            else
            {
              BtnSacaFoto.disabled = false
              BtnComparar.disabled = false
              console.log('Se encontró rostro, pero NO es una CI')
              document.getElementById("resultado").innerHTML += 'Se encontró rostro, pero NO es una CI' +'\n'  
            }
          });
    }
  });

/*****Botón Comparación*****/
BtnComparar.addEventListener("click", async function () {
  BtnComparar.disabled = true
 const results = await faceapi.detectSingleFace(ObjVideo).withFaceLandmarks().withFaceDescriptor()
    if (!results)
    { 
      BtnComparar.disabled = false
      console.log('No detectó rostro en video')
      document.getElementById("resultado").innerHTML += 'No detectó rostro en video' +'\n'  
    }
    else 
    {
      faceMatcher = new faceapi.FaceMatcher(results)
      const singleResult = await faceapi.detectSingleFace(ObjFoto).withFaceLandmarks().withFaceDescriptor()  
        if (singleResult)
        {
          BtnComparar.disabled = false
          const bestMatch = faceMatcher.findBestMatch(singleResult.descriptor)
          //Si es menor el número, más igualidad hay, se recomienda hasta 0.4 (60%)
          console.log('Porcentaje de similitud:', ((1-bestMatch.distance)*100).toFixed(2) + '%');
          document.getElementById("resultado").innerHTML += 'Porcentaje de similitud: ' + ((1-bestMatch.distance)*100).toFixed(2) +'%' + '\n';  
        }
        else
        {
          BtnComparar.disabled = false
          console.log('Comparativo: No encontró igualdad')
          document.getElementById("resultado").innerHTML += 'Comparativo: No encontró igualdad' +'\n'  
        }
    }
});