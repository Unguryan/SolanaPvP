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
      "name": "fulfillRandomness",
      "discriminator": [
        235,
        105,
        140,
        46,
        40,
        88,
        117,
        2
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
          "name": "vrf",
          "writable": true
        },
        {
          "name": "switchboardProgram",
          "address": "6sjKhUwzNRtFh6EmC32GwNRH7v7vCjfgeWpxYEcdvEBL"
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
          "name": "switchboardProgram",
          "address": "6sjKhUwzNRtFh6EmC32GwNRH7v7vCjfgeWpxYEcdvEBL"
        },
        {
          "name": "vrf",
          "writable": true
        },
        {
          "name": "oracleQueue",
          "writable": true
        },
        {
          "name": "queueAuthority"
        },
        {
          "name": "permissionAccount",
          "writable": true
        },
        {
          "name": "escrowWallet",
          "writable": true
        },
        {
          "name": "payerWallet",
          "writable": true
        },
        {
          "name": "payerAuthority",
          "signer": true
        },
        {
          "name": "recentBlockhashes"
        },
        {
          "name": "switchboardState"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
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
    },
    {
      "name": "oracleQueueAccountData",
      "discriminator": [
        164,
        207,
        200,
        51,
        199,
        113,
        35,
        109
      ]
    },
    {
      "name": "permissionAccountData",
      "discriminator": [
        77,
        37,
        177,
        164,
        38,
        39,
        34,
        109
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
            "name": "vrf",
            "type": "pubkey"
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
      "name": "oracleQueueAccountData",
      "serialization": "bytemuckunsafe",
      "repr": {
        "kind": "rust",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "docs": [
              "Name of the queue to store on-chain."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "metadata",
            "docs": [
              "Metadata of the queue to store on-chain."
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "authority",
            "docs": [
              "The account delegated as the authority for making account changes or assigning permissions targeted at the queue."
            ],
            "type": "pubkey"
          },
          {
            "name": "oracleTimeout",
            "docs": [
              "Interval when stale oracles will be removed if they fail to heartbeat."
            ],
            "type": "u32"
          },
          {
            "name": "reward",
            "docs": [
              "Rewards to provide oracles and round openers on this queue."
            ],
            "type": "u64"
          },
          {
            "name": "minStake",
            "docs": [
              "The minimum amount of stake oracles must present to remain on the queue."
            ],
            "type": "u64"
          },
          {
            "name": "slashingEnabled",
            "docs": [
              "Whether slashing is enabled on this queue."
            ],
            "type": "bool"
          },
          {
            "name": "varianceToleranceMultiplier",
            "docs": [
              "The tolerated variance amount oracle results can have from the accepted round result before being slashed.",
              "slashBound = varianceToleranceMultiplier * stdDeviation Default: 2"
            ],
            "type": {
              "defined": {
                "name": "switchboardDecimal"
              }
            }
          },
          {
            "name": "feedProbationPeriod",
            "docs": [
              "Number of update rounds new feeds are on probation for.",
              "If a feed returns 429s within probation period, auto disable permissions."
            ],
            "type": "u32"
          },
          {
            "name": "currIdx",
            "docs": [
              "Current index of the oracle rotation."
            ],
            "type": "u32"
          },
          {
            "name": "size",
            "docs": [
              "Current number of oracles on a queue."
            ],
            "type": "u32"
          },
          {
            "name": "gcIdx",
            "docs": [
              "Garbage collection index."
            ],
            "type": "u32"
          },
          {
            "name": "consecutiveFeedFailureLimit",
            "docs": [
              "Consecutive failure limit for a feed before feed permission is revoked."
            ],
            "type": "u64"
          },
          {
            "name": "consecutiveOracleFailureLimit",
            "docs": [
              "Consecutive failure limit for an oracle before oracle permission is revoked."
            ],
            "type": "u64"
          },
          {
            "name": "unpermissionedFeedsEnabled",
            "docs": [
              "Enabling this setting means data feeds do not need explicit permission to join the queue and request new values from its oracles."
            ],
            "type": "bool"
          },
          {
            "name": "unpermissionedVrfEnabled",
            "docs": [
              "Enabling this setting means VRF accounts do not need explicit permission to join the queue and request new values from its oracles."
            ],
            "type": "bool"
          },
          {
            "name": "curatorRewardCut",
            "docs": [
              "TODO: Revenue percentage rewarded to job curators overall."
            ],
            "type": {
              "defined": {
                "name": "switchboardDecimal"
              }
            }
          },
          {
            "name": "lockLeaseFunding",
            "docs": [
              "Prevent new leases from being funded n this queue.",
              "Useful to turn down a queue for migrations, since authority is always immutable."
            ],
            "type": "bool"
          },
          {
            "name": "mint",
            "docs": [
              "Token mint used for the oracle queue rewards and slashing."
            ],
            "type": "pubkey"
          },
          {
            "name": "enableBufferRelayers",
            "docs": [
              "Whether oracles are permitted to fulfill buffer relayer update request."
            ],
            "type": "bool"
          },
          {
            "name": "ebuf",
            "docs": [
              "Reserved for future info."
            ],
            "type": {
              "array": [
                "u8",
                968
              ]
            }
          },
          {
            "name": "maxSize",
            "docs": [
              "Maximum number of oracles a queue can support."
            ],
            "type": "u32"
          },
          {
            "name": "dataBuffer",
            "docs": [
              "The public key of the OracleQueueBuffer account holding a collection of Oracle pubkeys that haver successfully heartbeated before the queues `oracleTimeout`."
            ],
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "permissionAccountData",
      "serialization": "bytemuckunsafe",
      "repr": {
        "kind": "rust",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "The authority that is allowed to set permissions for this account."
            ],
            "type": "pubkey"
          },
          {
            "name": "permissions",
            "docs": [
              "The SwitchboardPermission enumeration assigned by the granter to the grantee."
            ],
            "type": "u32"
          },
          {
            "name": "granter",
            "docs": [
              "Public key of account that is granting permissions to use its resources."
            ],
            "type": "pubkey"
          },
          {
            "name": "grantee",
            "docs": [
              "Public key of account that is being assigned permissions to use a granters resources."
            ],
            "type": "pubkey"
          },
          {
            "name": "expiration",
            "docs": [
              "unused currently. may want permission PDA per permission for",
              "unique expiration periods, BUT currently only one permission",
              "per account makes sense for the infra. Dont over engineer."
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "The PDA bump to derive the pubkey."
            ],
            "type": "u8"
          },
          {
            "name": "ebuf",
            "docs": [
              "Reserved for future info."
            ],
            "type": {
              "array": [
                "u8",
                255
              ]
            }
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
          }
        ]
      }
    },
    {
      "name": "switchboardDecimal",
      "serialization": "bytemuckunsafe",
      "repr": {
        "kind": "rust",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mantissa",
            "docs": [
              "The part of a floating-point number that represents the significant digits of that number, and that is multiplied by the base, 10, raised to the power of scale to give the actual value of the number."
            ],
            "type": "i128"
          },
          {
            "name": "scale",
            "docs": [
              "The number of decimal places to move to the left to yield the actual value."
            ],
            "type": "u32"
          }
        ]
      }
    }
  ]
};


// Export the IDL as a const that can be used with Program
import idlJson from "./pvp_program.json";
export const IDL: PvpProgram = idlJson as unknown as PvpProgram;