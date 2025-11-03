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
            // Use SOURCE directory instead of bin/ directory (where node_modules are!)
            // This is critical for npx/ts-node to find dependencies
            var assemblyDir = AppDomain.CurrentDomain.BaseDirectory;
            var scriptPath = Path.Combine(assemblyDir, "scripts", scriptName);

            if (!File.Exists(scriptPath))
            {
                throw new FileNotFoundException($"Script not found: {scriptPath}");
            }

            var scriptsDir = Path.GetDirectoryName(scriptPath)!;
            _logger.LogInformation("[NodeScriptExecutor] Executing {Script} from directory: {Dir}", 
                scriptName, scriptsDir);
            _logger.LogInformation("[NodeScriptExecutor] Script path: {Path}", scriptPath);
            _logger.LogInformation("[NodeScriptExecutor] node_modules exists: {Exists}", 
                Directory.Exists(Path.Combine(scriptsDir, "node_modules")));

            // Determine if TypeScript or JavaScript
            var isTypeScript = scriptPath.EndsWith(".ts", StringComparison.OrdinalIgnoreCase);
            
            string executor;
            string executorArgs;
            
            if (isTypeScript)
            {
                // For TypeScript: use tsx (ESM + TypeScript support with JSON imports)
                executor = "cmd.exe";
                executorArgs = $"/c tsx \"{scriptPath}\" {string.Join(" ", args.Select(a => $"\"{a}\""))}";
                _logger.LogInformation("[NodeScriptExecutor] Using global tsx (ESM + TypeScript support)");
            }
            else
            {
                // For JavaScript: use node
                executor = "node";
                executorArgs = $"\"{scriptPath}\" {string.Join(" ", args.Select(a => $"\"{a}\""))}";
            }

            _logger.LogDebug("[NodeScriptExecutor] Executor: {Executor}, Args: {Args}", executor, executorArgs);

            var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = executor,
                    Arguments = executorArgs,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    WorkingDirectory = scriptsDir // ← RUN FROM SCRIPTS DIR WHERE node_modules EXIST!
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

