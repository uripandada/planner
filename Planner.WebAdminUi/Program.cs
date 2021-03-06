using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Planner.Application.Admin.Interfaces;
using Planner.Application.Interfaces;
using Planner.Persistence.DataSeed;
using System;
using System.IO;
using System.Threading.Tasks;

namespace Planner.WebAdminUi
{
	public class Program
	{
		public static async Task Main(string[] args)
		{
			var host = BuildHost(args);

			await _InitializeDatabase(host);

			host.Run();
		}

		public static IHost BuildHost(string[] args)
		{
			return CreateHostBuilder(args).Build();

		}
		public static IHostBuilder CreateHostBuilder(string[] args)
		{
			return Host.CreateDefaultBuilder(args)
				.ConfigureLogging(logging =>
                {
					logging.AddConsole();
                })
				.ConfigureAppConfiguration((hostingContext, config) =>
				{
					var env = hostingContext.HostingEnvironment;

					config.AddJsonFile(Path.Combine("AppSettings", $"appsettings.json"), optional: true);
					config.AddJsonFile(Path.Combine("AppSettings", $"appsettings.{env.EnvironmentName}.json"), optional: true);

					config.AddEnvironmentVariables();
				})
				.ConfigureWebHostDefaults(webBuilder =>
				{
					webBuilder.UseStartup<Startup>();
				});

		}

		private static async Task _InitializeDatabase(IHost webHost)
		{
			using (var scope = webHost.Services.CreateScope())
			{
				try
				{
					var masterContext = scope.ServiceProvider.GetService<IMasterDatabaseContext>();
					await masterContext.Database.MigrateAsync();

					await MasterDataSeed.SeedMasterData(masterContext, webHost.Services);
					await MasterDataSeed.SeedAuthenticationClients(masterContext, webHost.Services);
				}
				catch (Exception ex)
				{
					throw;
				}
			}
		}
	}
}
