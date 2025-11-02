/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/pvp_program.json`.
 */
export type PvpProgram = {
  "address": "F2LhVGUa9yLbYVYujYMPyckqWmsokHE9wym7ceGHWUMZ",
  "metadata": {
    "name": "pvpProgram",
    "version": "1.0.0",
    "spec": "0.1.0",
    "description": "Solana PvP Game Program with Switchboard VRF"
  },
  "instructions": [
    {
      "name": "createLobby",
      "discriminator": [
        116,
        55,
        74,
        48,
        40,
        51,
        135,
        155
      ],
      "accounts": [
        {
          "name": "lobby",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  98,
                  98,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "arg",
                "path": "lobbyId"
              }
            ]
          }
        },
        {
          "name": "active",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  116,
                  105,
                  118,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "lobbyId",
          "type": "u64"
        },
        {
          "name": "teamSize",
          "type": "u8"
        },
        {
          "name": "stakeLamports",
          "type": "u64"
        },
        {
          "name": "side",
          "type": "u8"
        }
      ]
    },
    {
      "name": "forceRefund",
      "discriminator": [
        127,
        173,
        30,
        92,
        164,
        123,
        109,
        177
      ],
      "accounts": [
        {
          "name": "lobby",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  98,
                  98,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "lobby.creator",
                "account": "lobby"
              },
              {
                "kind": "account",
                "path": "lobby.lobby_id",
                "account": "lobby"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true
        },
        {
          "name": "requester",
          "signer": true
        },
        {
          "name": "active",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  116,
                  105,
                  118,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "lobby.creator",
                "account": "lobby"
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initConfig",
      "discriminator": [
        23,
        235,
        115,
        232,
        168,
        96,
        1,
        231
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "admin",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "joinSide",
      "discriminator": [
        72,
        81,
        137,
        98,
        213,
        63,
        154,
        117
      ],
      "accounts": [
        {
          "name": "lobby",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  98,
                  98,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "account",
                "path": "lobby.lobby_id",
                "account": "lobby"
              }
            ]
          }
        },
        {
          "name": "creator",
          "relations": [
            "lobby"
          ]
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "active",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  116,
                  105,
                  118,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "lobby.creator",
                "account": "lobby"
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "side",
          "type": "u8"
        }
      ]
    },
    {
      "name": "joinSideFinal",
      "discriminator": [
        145,
        130,
        102,
        65,
        104,
        78,
        171,
        113
      ],
      "accounts": [
        {
          "name": "lobby",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  98,
                  98,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "account",
                "path": "lobby.lobby_id",
                "account": "lobby"
              }
            ]
          }
        },
        {
          "name": "creator",
          "relations": [
            "lobby"
          ]
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "active",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  116,
                  105,
                  118,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "lobby.creator",
                "account": "lobby"
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "randomnessAccountData",
          "docs": [
            "Switchboard OnDemand randomness account"
          ],
          "writable": true
        },
        {
          "name": "switchboardProgram",
          "address": "BeFxPRDreo8uLivyGgqDE87iGaU3o1Tw9hZw46NxYaej"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "side",
          "type": "u8"
        }
      ]
    },
    {
      "name": "refund",
      "discriminator": [
        2,
        96,
        183,
        251,
        63,
        208,
        46,
        46
      ],
      "accounts": [
        {
          "name": "lobby",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  98,
                  98,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "lobby.creator",
                "account": "lobby"
              },
              {
                "kind": "account",
                "path": "lobby.lobby_id",
                "account": "lobby"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true
        },
        {
          "name": "requester",
          "signer": true
        },
        {
          "name": "active",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  116,
                  105,
                  118,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "lobby.creator",
                "account": "lobby"
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "resolveMatch",
      "discriminator": [
        73,
        0,
        15,
        197,
        178,
        47,
        21,
        193
      ],
      "accounts": [
        {
          "name": "lobby",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  98,
                  98,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "lobby.creator",
                "account": "lobby"
              },
              {
                "kind": "account",
                "path": "lobby.lobby_id",
                "account": "lobby"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true
        },
        {
          "name": "active",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  116,
                  105,
                  118,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "lobby.creator",
                "account": "lobby"
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "randomnessAccountData",
          "docs": [
            "Switchboard OnDemand randomness account",
            "CRITICAL: Must be owned by Switchboard and match the saved account",
            "This ensures randomness is provably fair and cannot be manipulated"
          ],
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "activeLobby",
      "discriminator": [
        32,
        130,
        43,
        176,
        36,
        236,
        20,
        114
      ]
    },
    {
      "name": "globalConfig",
      "discriminator": [
        149,
        8,
        156,
        202,
        160,
        252,
        176,
        217
      ]
    },
    {
      "name": "lobby",
      "discriminator": [
        167,
        194,
        217,
        163,
        92,
        92,
        103,
        49
      ]
    }
  ],
  "events": [
    {
      "name": "lobbyCreated",
      "discriminator": [
        109,
        169,
        16,
        50,
        169,
        242,
        237,
        65
      ]
    },
    {
      "name": "lobbyRefunded",
      "discriminator": [
        37,
        99,
        34,
        76,
        175,
        241,
        3,
        174
      ]
    },
    {
      "name": "lobbyResolved",
      "discriminator": [
        155,
        179,
        219,
        168,
        63,
        242,
        104,
        137
      ]
    },
    {
      "name": "playerJoined",
      "discriminator": [
        39,
        144,
        49,
        106,
        108,
        210,
        183,
        38
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidSide",
      "msg": "Invalid side (must be 0 or 1)"
    },
    {
      "code": 6001,
      "name": "lobbyNotOpen",
      "msg": "Lobby is not open"
    },
    {
      "code": 6002,
      "name": "lobbyNotOpenForJoin",
      "msg": "Lobby already pending/resolved/refunded"
    },
    {
      "code": 6003,
      "name": "sideFull",
      "msg": "Side is full"
    },
    {
      "code": 6004,
      "name": "alreadyJoined",
      "msg": "Player already joined"
    },
    {
      "code": 6005,
      "name": "notEnoughPlayers",
      "msg": "Not enough players"
    },
    {
      "code": 6006,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6007,
      "name": "stakeTooSmall",
      "msg": "Stake is below minimum"
    },
    {
      "code": 6008,
      "name": "tooSoonToRefund",
      "msg": "Too soon to refund"
    },
    {
      "code": 6009,
      "name": "alreadyFinalized",
      "msg": "Already finalized"
    },
    {
      "code": 6010,
      "name": "badRemainingAccounts",
      "msg": "Bad remaining accounts length"
    },
    {
      "code": 6011,
      "name": "invalidTeamSize",
      "msg": "Invalid team size (allowed: 1, 2, 5)"
    },
    {
      "code": 6012,
      "name": "remainingAccountsMismatch",
      "msg": "Remaining accounts mismatch with team lists"
    },
    {
      "code": 6013,
      "name": "wrongSwitchboardProgram",
      "msg": "Wrong Switchboard program id"
    },
    {
      "code": 6014,
      "name": "wrongVrfAccount",
      "msg": "VRF account does not match lobby"
    },
    {
      "code": 6015,
      "name": "wrongVrfAuthority",
      "msg": "VRF authority mismatch"
    },
    {
      "code": 6016,
      "name": "notPending",
      "msg": "Lobby not pending"
    },
    {
      "code": 6017,
      "name": "mustUseFinalJoin",
      "msg": "Lobby is full - must use join_side_final instruction"
    },
    {
      "code": 6018,
      "name": "wrongRandomnessAccount",
      "msg": "Wrong randomness account provided"
    },
    {
      "code": 6019,
      "name": "invalidRandomnessData",
      "msg": "Invalid randomness data"
    }
  ],
  "types": [
    {
      "name": "activeLobby",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "lobby",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "globalConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "admin",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "lobby",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "lobbyId",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "lobbyStatus"
              }
            }
          },
          {
            "name": "teamSize",
            "type": "u8"
          },
          {
            "name": "stakeLamports",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "finalized",
            "type": "bool"
          },
          {
            "name": "randomnessAccount",
            "type": "pubkey"
          },
          {
            "name": "winnerSide",
            "type": "u8"
          },
          {
            "name": "team1",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "team2",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "lobbyCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lobby",
            "type": "pubkey"
          },
          {
            "name": "lobbyId",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "stakeLamports",
            "type": "u64"
          },
          {
            "name": "teamSize",
            "type": "u8"
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "lobbyRefunded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lobby",
            "type": "pubkey"
          },
          {
            "name": "refundedCount",
            "type": "u8"
          },
          {
            "name": "totalRefunded",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "lobbyResolved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lobby",
            "type": "pubkey"
          },
          {
            "name": "winnerSide",
            "type": "u8"
          },
          {
            "name": "randomnessValue",
            "type": "u64"
          },
          {
            "name": "totalPot",
            "type": "u64"
          },
          {
            "name": "platformFee",
            "type": "u64"
          },
          {
            "name": "payoutPerWinner",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "lobbyStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "pending"
          },
          {
            "name": "resolved"
          },
          {
            "name": "refunded"
          }
        ]
      }
    },
    {
      "name": "playerJoined",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lobby",
            "type": "pubkey"
          },
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "team1Count",
            "type": "u8"
          },
          {
            "name": "team2Count",
            "type": "u8"
          },
          {
            "name": "isFull",
            "type": "bool"
          },
          {
            "name": "randomnessAccount",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};


// Export the IDL as a const that can be used with Program
import idlJson from "./pvp_program.json";
export const IDL: PvpProgram = idlJson as unknown as PvpProgram;