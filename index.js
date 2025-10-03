const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const rpcUser = "user";
const rpcPassword = "password";
const rpcUrl = "http://localhost:18332/";

async function callRpc(method, params = []) {
  const res = await axios.post(rpcUrl, {
    jsonrpc: "1.0",
    id: "curltext",
    method,
    params
  }, {
    auth: { username: rpcUser, password: rpcPassword }
  });
  return res.data.result;
}

app.get('/balance', async (req, res) => {
  try {
    const balance = await callRpc("getbalance");
    res.json({ balance });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/send', async (req, res) => {
  try {
    const { address, amount } = req.body;
    const txid = await callRpc("sendtoaddress", [address, amount]);
    res.json({ txid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => console.log("Backend running on port 3000"));
