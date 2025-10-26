using SolanaPvP.Application.Interfaces.SolanaRPC;
using SolanaPvP.Domain.Settings;

namespace SolanaPvP.SolanaRPC.Services;

public class TxVerifier : ITxVerifier
{
    private readonly SolanaSettings _solanaSettings;

    public TxVerifier(SolanaSettings solanaSettings)
    {
        _solanaSettings = solanaSettings;
    }

    public bool ValidateInstructionsContainProgram(string txMessage, string programId)
    {
        try
        {
            // This is a simplified validation - in reality, you'd need to parse the transaction message
            // and check if any instruction references the specified program ID
            
            // For now, we'll just check if the program ID is mentioned in the transaction
            return txMessage.Contains(programId) || txMessage.Contains(_solanaSettings.ProgramId);
        }
        catch (Exception)
        {
            return false;
        }
    }
}
