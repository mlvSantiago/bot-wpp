//importações
require('dotenv').config();
const venom = require('venom-bot');
const { google } = require('googleapis');
const fs = require('fs');
const { error } = require('console');

//cria objeto de autentificação , passa como paramtro a keyfile e o scopo (permissões que o bot tera)
const auth = new google.auth.GoogleAuth({
    keyFile: 'credenciais.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  // ID da planilha (entre /d/ e /edit)
const SPREADSHEET_ID = '1FOCst30WHRhOOtocbDhP_smHlGF7e-9JHsDZOMg-VSY';

let sheets;
venom
  .create({
    session: 'bot-gerenciamento-gastos', // nome personalizado da sessão
    headless: false, //quando true, roda no navegador invisivel
    useChrome: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'//caminho do navegador 
  })
  .then(async (client) => {
    const authClient = await auth.getClient(); // inicializa api
    sheets = google.sheets({ version: 'v4', auth: authClient });
    start(client);
  })
  .catch((error) => console.error(error));
/*
  function procuraCategoria(categoriaProcurada , i) {

    const res =  sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID, 
      range:`'${mesAtual}/25!A4:A22'`
    });
    let categoriasPlanilha = res.data.values;
    for(i = 0; i<categoriasPlanilha[i][0].length; i++) {
      if(categoriaProcurada === categoriasPlanilha[i][0]) {
        return true;

      }
    }
    return false;

  }*/

const hoje = new Date();
let mesAtual = hoje.getMonth() + 1;


async function start(client) {
    client.onMessage(async (message) => {
    if (!message.body) return;
      
    if(message.body.startsWith("Menu:")) {

        try {
            const menu = fs.readFileSync('./messageMenu.txt', 'utf8');
            await client.sendText(message.from, menu);   
        }catch (error) {
            console.error("Erro ao ler o arquivo do menu:", error) 
            client.sendText(message.from,"❌ Erro ao carregar o menu.")
        }

    }else if (message.body.startsWith("Adicionar:")) {
        const dados = message.body.replace("Adicionar:", "").trim().split(" ");
        const categoria = dados[0]?.trim();
        const valor = dados[1]?.trim();
  
        if (!categoria || !valor) {
          client.sendText(message.from, "❌Formato inválido. Use: Adicionar: Categoria Valor");
          return;
        }

        try{
          const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range:  `'${mesAtual}/2025!A4:A22'`
          });
          const categoriasPlanilha = res.data.values;

          const val = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${mesAtual}/2025!B4:B22'`
          });
          const gastosPlanilha = val.data.values;

          let encontrou = false;
          let i=0;
          let soma = 0;

          console.log('Categoria procurada:', categoria.toLowerCase());

          for(i; i<categoriasPlanilha.length;i++) {
            if(categoria.toLowerCase() === categoriasPlanilha[i][0].toLowerCase()) {
              console.log('Categorias encontradas na planilha:', categoriasPlanilha[i][0].toLowerCase());
              encontrou = true;
              const valorConvertido = parseFloat(valor.replace(",", "."));
              const valorAtual = parseFloat(gastosPlanilha[i][0].replace(",", "."));
              soma = valorAtual + valorConvertido;
              break;
            }
          }
          if(!encontrou ){
            await client.sendText(message.from, "❌Categoria inválida. Use _*Menu:*_ para visualizar as categorias disponíveis");    
          }else{
            let faixa = `'${mesAtual}/2025!B'`+(i+4);
            console.log('Range encontrado:', faixa);
            await sheets.spreadsheets.values.update({
              spreadsheetId: SPREADSHEET_ID,
              range: faixa ,
              valueInputOption: 'RAW',
              requestBody: {
                values: [[soma]]
              }
            })
            await client.sendText(message.from, `✅ Adicionado  ${valor} em ${categoria}\n💸Total gasto em ${categoria}: ${soma}`);
          }
        }catch(error){//enter-nder essa estrutura
          console.error("Erro ao acessar a plailha", error);
          client.sendText(message.from, "❌ Erro ao buscar os dados da planilha.");

        }

      }else if(message.body.startsWith("Visualizar:")) {
        const dados = message.body.replace("Visualizar:","").trim();
        const categoria = dados.trim();
        
        if(!categoria){
          client.sendText(message.from, "❌Formato Inválido. Use: Visualizar: Categoria");
          return;
        }
        try{
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${mesAtual}/2025!A4:A22'`
        });
        const categoriasPlanilha = res.data.values;

        const val = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${mesAtual}/2025!B4:B22'`
        });
        const gastosPlanilha = val.data.values;

        let encontrado = false;

        for( let i = 0; i<categoriasPlanilha.length; i++ )
        {
          if (categoria.toLowerCase() === categoriasPlanilha[i][0].toLowerCase()) {
            encontrado = true;
            client.sendText(message.from, `💸 R$${gastosPlanilha[i][0]} gastos na categoria *${categoriasPlanilha[i][0]}*`);
            break;
          }
        }
        if(!encontrado){

            await client.sendText(message.from, "❌Categoria inválida. Use _*Menu:*_ para visualizar as categorias disponíveis");
           
        }
      }catch (error) {
        console.error("Erro ao acessar a planilha:", error);
        client.sendText(message.from, "❌ Erro ao buscar os dados da planilha.");
      }


      }

    });
  }
  