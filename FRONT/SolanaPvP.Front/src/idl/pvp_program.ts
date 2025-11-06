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
    "description": "Solana PvP Game Program with Orao VRF"
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
        },
        {
          "name": "game",
          "type": "string"
        },
        {
          "name": "gameMode",
          "type": "string"
        },
        {
          "name": "arenaType",
          "type": "string"
        },
        {
          "name": "teamSizeStr",
          "type": "string"
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
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
          "name": "vrfRequest",
          "docs": [
            "Orao VRF randomness request account (PDA derived from seed)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  111,
                  45,
                  118,
                  114,
                  102,
                  45,
                  114,
                  97,
                  110,
                  100,
                  111,
                  109,
                  110,
                  101,
                  115,
                  115,
                  45,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "vrfSeed"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                7,
                71,
                177,
                26,
                250,
                145,
                180,
                209,
                249,
                34,
                242,
                123,
                14,
                186,
                193,
                218,
                178,
                59,
                33,
                41,
                164,
                190,
                243,
                79,
                50,
                164,
                123,
                88,
                245,
                206,
                252,
                120
              ]
            }
          }
        },
        {
          "name": "vrfConfig",
          "docs": [
            "Orao VRF network configuration"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  111,
                  45,
                  118,
                  114,
                  102,
                  45,
                  110,
                  101,
                  116,
                  119,
                  111,
                  114,
                  107,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103,
                  117,
                  114,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                7,
                71,
                177,
                26,
                250,
                145,
                180,
                209,
                249,
                34,
                242,
                123,
                14,
                186,
                193,
                218,
                178,
                59,
                33,
                41,
                164,
                190,
                243,
                79,
                50,
                164,
                123,
                88,
                245,
                206,
                252,
                120
              ]
            }
          }
        },
        {
          "name": "vrfTreasury",
          "docs": [
            "Orao VRF treasury (fee collector)"
          ],
          "writable": true
        },
        {
          "name": "vrfProgram",
          "docs": [
            "Orao VRF program"
          ],
          "address": "VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y"
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
        },
        {
          "name": "vrfSeed",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
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
          "name": "vrfRequest",
          "docs": [
            "Orao VRF randomness request account",
            "CRITICAL: Must be owned by Orao VRF and match the saved account",
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
    },
    {
      "name": "networkState",
      "discriminator": [
        212,
        237,
        148,
        56,
        97,
        245,
        51,
        169
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
      "name": "notPending",
      "msg": "Lobby not pending"
    },
    {
      "code": 6014,
      "name": "mustUseFinalJoin",
      "msg": "Lobby is full - must use join_side_final instruction"
    },
    {
      "code": 6015,
      "name": "wrongRandomnessAccount",
      "msg": "Wrong VRF request account provided"
    },
    {
      "code": 6016,
      "name": "invalidRandomnessData",
      "msg": "Invalid randomness data"
    },
    {
      "code": 6017,
      "name": "randomnessNotFulfilled",
      "msg": "Randomness not yet fulfilled by Orao VRF"
    },
    {
      "code": 6018,
      "name": "wrongVrfTreasury",
      "msg": "Wrong VRF treasury"
    },
    {
      "code": 6019,
      "name": "invalidVrfSeed",
      "msg": "Invalid VRF seed (cannot be zero)"
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
            "name": "vrfSeed",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "vrfRequest",
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
          },
          {
            "name": "game",
            "type": "string"
          },
          {
            "name": "gameMode",
            "type": "string"
          },
          {
            "name": "arenaType",
            "type": "string"
          },
          {
            "name": "teamSizeStr",
            "type": "string"
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
          },
          {
            "name": "game",
            "type": "string"
          },
          {
            "name": "gameMode",
            "type": "string"
          },
          {
            "name": "arenaType",
            "type": "string"
          },
          {
            "name": "teamSizeStr",
            "type": "string"
          },
          {
            "name": "creatorSide",
            "type": "u8"
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
      "name": "networkConfiguration",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "requestFee",
            "type": "u64"
          },
          {
            "name": "fulfillmentAuthorities",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "tokenFeeConfig",
            "type": {
              "option": {
                "defined": {
                  "name": "oraoTokenFeeConfig"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "networkState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "config",
            "type": {
              "defined": {
                "name": "networkConfiguration"
              }
            }
          },
          {
            "name": "numReceived",
            "docs": [
              "Total number of received requests."
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "oraoTokenFeeConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "docs": [
              "ORAO token mint address."
            ],
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "docs": [
              "ORAO token treasury account."
            ],
            "type": "pubkey"
          },
          {
            "name": "fee",
            "docs": [
              "Fee in ORAO SPL token smallest units."
            ],
            "type": "u64"
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
            "name": "vrfRequest",
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