using SolanaPvP.API_Project.Extensions;
using SolanaPvP.API_Project.Hubs;
using SolanaPvP.API_Project.Middleware;
using SolanaPvP.API_Project.Workers;
using SolanaPvP.Application;
using SolanaPvP.Domain;
using SolanaPvP.EF_Core;
using SolanaPvP.Infrastructure;
using SolanaPvP.SolanaRPC;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// Add SignalR
builder.Services.AddSignalR();

// Register all layers using extension methods
builder.Services.AddEfCore(builder.Configuration);
builder.Services.AddApplication(builder.Configuration);
builder.Services.AddInfrastructure();
builder.Services.AddSolanaRPC();

// Register background workers
builder.Services.AddHostedService<IndexerWorker>();
builder.Services.AddHostedService<RefundBotWorker>();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// Add CORS for SignalR
app.UseCors(policy =>
{
    policy.AllowAnyOrigin()
          .AllowAnyMethod()
          .AllowAnyHeader();
});

// Add custom middleware
app.UseMiddleware<PubkeyMiddleware>();

// Map controllers FIRST (before static files)
app.MapControllers();

// Map SignalR hub
app.MapHub<MatchHub>("/ws");

// Serve static files from wwwroot (after API routes)
app.UseDefaultFiles();
app.UseStaticFiles();

// SPA fallback - serve index.html for client-side routing
app.MapFallbackToFile("index.html");

// Ensure database is created
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<SolanaPvP.EF_Core.Context.SolanaPvPDbContext>();
    context.Database.EnsureCreated();
} 

app.Run();
