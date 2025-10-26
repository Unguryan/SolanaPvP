using Microsoft.EntityFrameworkCore;
using SolanaPvP.API_Project.Extensions;
using SolanaPvP.API_Project.Hubs;
using SolanaPvP.API_Project.Middleware;
using SolanaPvP.API_Project.Workers;
using SolanaPvP.Application.Interfaces.Repositories;
using SolanaPvP.Application.Interfaces.Services;
using SolanaPvP.Application.Interfaces.SolanaRPC;
using SolanaPvP.Domain.Settings;
using SolanaPvP.EF_Core.Context;
using SolanaPvP.EF_Core.Repositories;
using SolanaPvP.Infrastructure.Services;
using SolanaPvP.SolanaRPC.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddOpenApi();

// Configure settings
builder.Services.Configure<SolanaSettings>(builder.Configuration.GetSection("Solana"));
builder.Services.Configure<IndexerSettings>(builder.Configuration.GetSection("Indexer"));
builder.Services.Configure<RefundSettings>(builder.Configuration.GetSection("Refund"));
builder.Services.Configure<CommissionSettings>(builder.Configuration.GetSection("Commission"));

// Add Entity Framework
builder.Services.AddDbContext<SolanaPvPDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add SignalR
builder.Services.AddSignalR();

// Add HTTP client for RPC calls
builder.Services.AddHttpClient<IRpcReader, RpcReader>();

// Register repositories
builder.Services.AddScoped<IMatchRepository, MatchRepository>();
builder.Services.AddScoped<IEventRepository, EventRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IRefundTaskRepository, RefundTaskRepository>();
builder.Services.AddScoped<IMatchInvitationRepository, MatchInvitationRepository>();

// Register services
builder.Services.AddScoped<IMatchService, MatchService>();
builder.Services.AddScoped<IGameDataGenerator, GameDataGenerator>();
builder.Services.AddScoped<IRefundScheduler, RefundScheduler>();
builder.Services.AddScoped<IIndexerStateManager, IndexerStateManager>();
builder.Services.AddScoped<IUsernameService, UsernameService>();
builder.Services.AddScoped<IInvitationService, InvitationService>();

// Register SolanaRPC services
builder.Services.AddScoped<IEventParser, EventParser>();
builder.Services.AddScoped<ITxVerifier, TxVerifier>();
builder.Services.AddScoped<IRefundSender, RefundSender>();
builder.Services.AddSingleton<IWsSubscriber, WsSubscriber>();

// Register settings as singletons for easy access
builder.Services.AddSingleton<SolanaSettings>(provider =>
    builder.Configuration.GetSection("Solana").Get<SolanaSettings>() ?? new SolanaSettings());
builder.Services.AddSingleton<IndexerSettings>(provider =>
    builder.Configuration.GetSection("Indexer").Get<IndexerSettings>() ?? new IndexerSettings());
builder.Services.AddSingleton<RefundSettings>(provider =>
    builder.Configuration.GetSection("Refund").Get<RefundSettings>() ?? new RefundSettings());

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

// Map controllers
app.MapControllers();

// Map SignalR hub
app.MapHub<MatchHub>("/ws");

// Ensure database is created
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<SolanaPvPDbContext>();
    context.Database.EnsureCreated();
}

app.Run();
