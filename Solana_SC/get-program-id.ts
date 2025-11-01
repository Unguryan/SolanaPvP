import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as fs from "fs";

const keypairPath = "target/deploy/pvp_program-keypair.json";
const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
const keypair = anchor.web3.Keypair.fromSecretKey(Uint8Array.from(keypairData));

console.log("Program ID:", keypair.publicKey.toString());
