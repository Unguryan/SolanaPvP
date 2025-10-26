namespace SolanaPvP.Application.Interfaces.SolanaRPC;

public interface ITxVerifier
{
    bool ValidateInstructionsContainProgram(string txMessage, string programId);
}
