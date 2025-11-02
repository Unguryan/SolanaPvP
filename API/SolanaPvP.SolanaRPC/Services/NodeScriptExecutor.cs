using Microsoft.Extensions.Logging;
using System.Diagnostics;

namespace SolanaPvP.SolanaRPC.Services;

public class NodeScriptExecutor
{
    private readonly ILogger<NodeScriptExecutor> _logger;

    public NodeScriptExecutor(ILogger<NodeScriptExecutor> logger)
    {
        _logger = logger;
    }

    public async Task<string> ExecuteAsync(string scriptName, params string[] args)
    {
        try
        {
            // Build script path relative to assembly location
            var assemblyDir = AppDomain.CurrentDomain.BaseDirectory;
            var scriptPath = Path.Combine(assemblyDir, "scripts", scriptName);

            if (!File.Exists(scriptPath))
            {
                throw new FileNotFoundException($"Script not found: {scriptPath}");
            }

            _logger.LogDebug("[NodeScriptExecutor] Executing {Script} with args: {Args}", 
                scriptName, string.Join(", ", args));

            var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "node",
                    Arguments = $"\"{scriptPath}\" {string.Join(" ", args.Select(a => $"\"{a}\""))}",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    WorkingDirectory = Path.GetDirectoryName(scriptPath)
                }
            };

            process.Start();

            var output = await process.StandardOutput.ReadToEndAsync();
            var error = await process.StandardError.ReadToEndAsync();
            
            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                _logger.LogError("[NodeScriptExecutor] Script {Script} failed with exit code {Code}. Error: {Error}", 
                    scriptName, process.ExitCode, error);
                throw new Exception($"Node script failed: {error}");
            }

            var signature = output.Trim();
            
            if (string.IsNullOrEmpty(signature))
            {
                throw new Exception("Script returned empty signature");
            }

            _logger.LogInformation("[NodeScriptExecutor] Script {Script} completed successfully. Signature: {Sig}", 
                scriptName, signature);

            return signature;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[NodeScriptExecutor] Failed to execute script {Script}", scriptName);
            throw;
        }
    }
}

