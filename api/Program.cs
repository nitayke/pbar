using Microsoft.EntityFrameworkCore;
using Pbar.Api.Data;
using Pbar.Api.Endpoints;
using Pbar.Api.Repositories;
using Pbar.Api.Services;
using Pbar.Api.Services.Interfaces;

var builder = WebApplication.CreateBuilder(args);

// ── Data ────────────────────────────────────────────────────────────────
builder.Services.AddDbContextFactory<AppDbContext>(options =>
    options.UseOracle(builder.Configuration.GetConnectionString("Default")));

// ── Options ─────────────────────────────────────────────────────────────
builder.Services.Configure<PartitioningOptions>(builder.Configuration.GetSection("Partitioning"));
builder.Services.Configure<MetricsOptions>(builder.Configuration.GetSection("Metrics"));

// ── Repositories ────────────────────────────────────────────────────────
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

// ── Services ────────────────────────────────────────────────────────────
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<IPartitionService, PartitionService>();
builder.Services.AddScoped<IRangeService, RangeService>();
builder.Services.AddScoped<IHistogramService, HistogramService>();

// ── Metrics background ─────────────────────────────────────────────────
builder.Services.AddSingleton<TaskMetricsCache>();
builder.Services.AddHostedService<TaskMetricsSampler>();

// ── Swagger & CORS ──────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("default", policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("default");

// ── Endpoints ───────────────────────────────────────────────────────────
app.MapHealthEndpoints()
   .MapTaskEndpoints()
   .MapPartitionEndpoints()
   .MapRangeEndpoints()
   .MapHistogramEndpoints();

app.Run();
