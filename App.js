import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function App() {
  const [balance, setBalance] = useState("...");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");

  async function fetchBalance() {
    const res = await fetch("http://localhost:3000/balance");
    const data = await res.json();
    setBalance(data.balance);
  }

  async function sendBTC() {
    const res = await fetch("http://localhost:3000/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, amount: parseFloat(amount) })
    });
    const data = await res.json();
    alert("TXID: " + data.txid);
    fetchBalance();
  }

  useEffect(() => {
    fetchBalance();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.balance}>₿ Balance: {balance}</Text>
      <TextInput 
        style={styles.input}
        placeholder="Recipient Address"
        placeholderTextColor="#777"
        value={address}
        onChangeText={setAddress}
      />
      <TextInput 
        style={styles.input}
        placeholder="Amount (BTC)"
        placeholderTextColor="#777"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />
      <TouchableOpacity style={styles.button} onPress={sendBTC}>
        <Text style={styles.buttonText}>SEND ➝</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black', padding: 20, justifyContent: 'center' },
  balance: { color: 'white', fontSize: 24, marginBottom: 20 },
  input: { backgroundColor: '#111', color: 'white', padding: 10, marginVertical: 10, borderRadius: 8 },
  button: { backgroundColor: '#F7931A', padding: 20, marginTop: 20, borderRadius: 10 },
  buttonText: { color: 'black', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }
});
